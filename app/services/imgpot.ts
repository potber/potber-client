import Service, { service } from '@ember/service';
import { appConfig } from 'potber-client/config/app.config';
import CustomSession from './custom-session';

export interface ImgpotImageVariation {
  variationType: 'large' | 'medium' | 'small';
  cdnUrl: string;
}

export interface ImgpotImage {
  id: number;
  originalFilename: string;
  variations: ImgpotImageVariation[];
}

export type ImgpotImageUploadResponse = ImgpotImage;

export interface ImgpotImageListResponse {
  images: ImgpotImage[];
  page: number;
  limit: number;
  total: number;
}

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

  private async request<T>(url: URL, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        ...init.headers,
      },
    });

    const data = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new Error(data?.message ?? 'Imgpot-Anfrage fehlgeschlagen.');
    }

    return data as T;
  }

  async uploadImage(file: File): Promise<ImgpotImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<ImgpotImageUploadResponse>(
      new URL('/api/images', appConfig.imgpotUrl),
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

    return this.request<ImgpotImageListResponse>(url);
  }
}
