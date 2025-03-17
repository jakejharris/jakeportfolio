declare module 'sanity' {
  interface StudioConfig {
    projectId: string;
    dataset: string;
    apiVersion?: string;
    title?: string;
    basePath?: string;
    plugins?: unknown[];
    schema?: {
      types: unknown[];
    };
    [key: string]: unknown;
  }
  
  export function defineConfig(config: StudioConfig): StudioConfig;
  export function structureTool(): unknown;
  export function visionTool(options?: {
    defaultApiVersion?: string;
    defaultDataset?: string;
  }): unknown;
}

declare module '@sanity/vision' {
  interface VisionToolOptions {
    defaultApiVersion?: string;
    defaultDataset?: string;
  }
  export function visionTool(options?: VisionToolOptions): unknown;
}

declare module 'next-sanity/studio' {
  interface StudioProps {
    config: unknown;
    [key: string]: unknown;
  }
  export const NextStudio: React.ComponentType<StudioProps>;
}

declare module 'next-sanity' {
  interface ClientConfig {
    projectId: string;
    dataset: string;
    apiVersion: string;
    useCdn?: boolean;
    token?: string;
    perspective?: string;
    [key: string]: unknown;
  }
  
  interface SanityClient {
    fetch: <T>(
      query: string, 
      params?: Record<string, unknown>, 
      options?: { next?: { tags?: string[]; revalidate?: number } }
    ) => Promise<T>;
    [key: string]: unknown;
  }
  
  export function createClient(config: ClientConfig): SanityClient;
}

declare module '@sanity/image-url' {
  interface ImageUrlBuilder {
    image: (source: SanityImageSource) => ImageUrlBuilderOptions;
  }
  
  interface ImageUrlBuilderOptions {
    url: () => string;
    width: (width: number) => ImageUrlBuilderOptions;
    height: (height: number) => ImageUrlBuilderOptions;
    [key: string]: unknown;
  }
  
  interface SanityImageSource {
    asset: {
      _ref: string;
      _type: string;
    };
    _type: string;
    [key: string]: unknown;
  }
  
  export default function imageUrlBuilder(client: unknown): ImageUrlBuilder;
} 