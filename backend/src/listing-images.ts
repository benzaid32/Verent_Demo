import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

const DEFAULT_LISTINGS_BUCKET = 'listing-images';

function getListingsBucket() {
  return env.SUPABASE_LISTINGS_BUCKET || DEFAULT_LISTINGS_BUCKET;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new Error('Only JPG, PNG, or WEBP data URLs are supported for listing images.');
  }

  const contentType = match[1];
  const base64Payload = match[2];
  const buffer = Buffer.from(base64Payload, 'base64');

  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error('Listing image must be 10MB or smaller.');
  }

  const extension = contentType === 'image/jpeg'
    ? 'jpg'
    : contentType === 'image/png'
      ? 'png'
      : 'webp';

  return {
    contentType,
    extension,
    buffer
  };
}

async function ensureBucket(client: SupabaseClient) {
  const bucket = getListingsBucket();
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list Supabase storage buckets: ${listError.message}`);
  }

  if (buckets.some((item) => item.name === bucket)) {
    return bucket;
  }

  const { error: createError } = await client.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  });
  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw new Error(`Failed to create Supabase storage bucket: ${createError.message}`);
  }

  return bucket;
}

export async function resolveListingImageUrl(
  client: SupabaseClient | null,
  listingId: string,
  ownerId: string,
  imageUrl?: string
) {
  if (!imageUrl) {
    return 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop';
  }

  if (!imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  if (!client) {
    return imageUrl;
  }

  const { buffer, contentType, extension } = parseDataUrl(imageUrl);
  const bucket = await ensureBucket(client);
  const objectPath = `${ownerId}/${listingId}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(objectPath, buffer, {
      contentType,
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Failed to upload listing image: ${uploadError.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}
