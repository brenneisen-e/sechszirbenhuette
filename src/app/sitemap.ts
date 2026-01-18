import { MetadataRoute } from 'next';

interface BlogPost {
  slug: string;
  published_at: string | null;
  updated_at: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sechszirbenhuette.pages.dev';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/impressum`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Try to fetch blog posts for dynamic sitemap entries
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    // Fetch blog posts from the internal API during build
    const response = await fetch(`${baseUrl}/api/blog?status=published`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (response.ok) {
      const data = await response.json() as { posts?: BlogPost[] };
      if (data.posts && data.posts.length > 0) {
        blogPages = data.posts.map((post) => ({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: new Date(post.updated_at || post.published_at || new Date()),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
      }
    }
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error);
    // Continue with static pages only
  }

  return [...staticPages, ...blogPages];
}
