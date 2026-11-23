import Service, { service } from '@ember/service';
import * as v from 'valibot';
import { appConfig } from 'potber-client/config/app.config';
import CustomSession from './custom-session';

const imageVariationSchema = v.object({
  variationType: v.picklist(['large', 'medium', 'small']),
  cdnUrl: v.string(),
});

const imageSchema = v.object({
  id: v.number(),
  originalFilename: v.string(),
  variations: v.array(imageVariationSchema),
});

const imageListSchema = v.object({
  images: v.array(imageSchema),
  page: v.number(),
  limit: v.number(),
  total: v.number(),
});

const errorMessageSchema = v.object({ message: v.string() });

export type ImgpotImageVariation = v.InferOutput<typeof imageVariationSchema>;
export type ImgpotImage = v.InferOutput<typeof imageSchema>;
export type ImgpotImageUploadResponse = ImgpotImage;
export type ImgpotImageListResponse = v.InferOutput<typeof imageListSchema>;

export interface ImgpotInsertValues {
  src: string;
  thumbnail: string;
}

export function getImgpotInsertValues(
  image: Pick<ImgpotImage, 'variations'>,
): ImgpotInsertValues {
  const large = image.variations.find(
    (variation) => variation.variationType === 'large',
  );
  const medium = image.variations.find(
    (variation) => variation.variationType === 'medium',
  );
  const fallback = image.variations[0];
  const inline = medium ?? large ?? fallback;
  const full = large ?? inline;

  if (!inline || !full) {
    throw new Error('Imgpot hat keine verwendbaren Varianten zurückgegeben.');
  }

  return {
    src: full.cdnUrl,
    thumbnail: full.cdnUrl === inline.cdnUrl ? '' : inline.cdnUrl,
  };
}

export default class ImgpotService extends Service {
  @service declare session: CustomSession;

  private get accessToken() {
    const accessToken = this.session.data?.authenticated?.access_token;
    if (!accessToken) {
      throw new Error('Nicht authentifiziert.');
    }

    return accessToken;
  }

  private async request<Schema extends v.GenericSchema>(
    url: URL,
    schema: Schema,
    init: RequestInit = {},
  ): Promise<v.InferOutput<Schema>> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        ...init.headers,
      },
    });

    const data: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const error = v.safeParse(errorMessageSchema, data);
      throw new Error(
        error.success ? error.output.message : 'Imgpot-Anfrage fehlgeschlagen.',
      );
    }

    const result = v.safeParse(schema, data);
    if (!result.success) {
      throw new Error('Imgpot hat eine ungültige Antwort zurückgegeben.');
    }
    return result.output;
  }

  async uploadImage(file: File): Promise<ImgpotImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(
      new URL('/api/images', appConfig.imgpotUrl),
      imageSchema,
      {
        method: 'POST',
        body: formData,
      },
    );
  }

  async listImages(page = 1, limit = 20): Promise<ImgpotImageListResponse> {
    const url = new URL('/api/images', appConfig.imgpotUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));

    return this.request(url, imageListSchema);
  }
}
