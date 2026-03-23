import Service, { service } from '@ember/service';
import { appConfig } from 'potber-client/config/app.config';
import CustomSession from './custom-session';

export interface ImgpotImageVariation {
  variationType: 'large' | 'medium' | 'small';
  cdnUrl: string;
}

export interface ImgpotImageUploadResponse {
  id: number;
  originalFilename: string;
  variations: ImgpotImageVariation[];
}

export default class ImgpotService extends Service {
  @service declare session: CustomSession;

  async uploadImage(file: File): Promise<ImgpotImageUploadResponse> {
    const accessToken = this.session.data?.authenticated?.access_token;
    if (!accessToken) {
      throw new Error('Nicht authentifiziert.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(new URL('/api/images', appConfig.imgpotUrl), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const data = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new Error(data?.message ?? 'Bild konnte nicht hochgeladen werden.');
    }

    return data as ImgpotImageUploadResponse;
  }
}
