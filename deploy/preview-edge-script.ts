// Bunny Edge Script (middleware) for the PR preview Pull Zone.
//
// One Storage Zone holds every preview in its own folder (pr-<number>/). This
// script maps the requested hostname to that folder before the request goes to
// the Storage Zone:
//
//   pr-132.preview.potber.de/assets/main.js  ->  /pr-132/assets/main.js
//   pr-132.preview.potber.de/auth/callback   ->  /pr-132/index.html
//
// Paths whose last segment has no file extension are Ember routes and get the
// preview's index.html, since a Storage Zone has only one zone-wide 404 file.
//
// Deploy it by pasting this file into the Edge Script linked to the preview
// Pull Zone (Edge Scripting -> Middleware).

import * as BunnySDK from '@bunny.net/edgescript-sdk@0.13.0';

const PREVIEW_HOST = /^(pr-\d+)\.preview\.potber\.de$/;

export function toStoragePath(
  hostname: string,
  pathname: string,
): string | null {
  const match = PREVIEW_HOST.exec(hostname.toLowerCase());
  if (!match) {
    return null;
  }

  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  const isFile = lastSegment.includes('.');

  return `/${match[1]}${isFile ? pathname : '/index.html'}`;
}

function previewHostname(request: Request): string {
  const url = new URL(request.url);
  if (PREVIEW_HOST.test(url.hostname)) {
    return url.hostname;
  }
  // The origin request may already carry the Storage Zone's hostname.
  return (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    url.hostname
  ).split(':')[0]!;
}

BunnySDK.net.http
  .servePullZone({ url: 'https://potber-preview.b-cdn.net' })
  .onOriginRequest((ctx) => {
    const url = new URL(ctx.request.url);
    const storagePath = toStoragePath(
      previewHostname(ctx.request),
      url.pathname,
    );

    if (!storagePath) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }

    url.pathname = storagePath;
    return Promise.resolve(new Request(url.toString(), ctx.request));
  });
