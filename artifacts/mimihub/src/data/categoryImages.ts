const personalCareImage = new URL(
  '../../../../attached_assets/A9C78911-D304-4CEA-971B-853D2AF63583_1786255707029.jpeg',
  import.meta.url,
).href;

export const categoryImages: Record<string, string> = {
  'personal-care': personalCareImage,
  'home-essentials':
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
};