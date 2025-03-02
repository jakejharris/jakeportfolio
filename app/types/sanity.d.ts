declare module 'sanity' {
  export function createStudio(config: any): React.ComponentType<any>;
  export function defineConfig(config: any): any;
  export function structureTool(): any;
}

declare module '@sanity/vision' {
  export function visionTool(options?: any): any;
}

declare module 'next-sanity/studio' {
  export const NextStudio: React.ComponentType<any>;
}

declare module 'next-sanity' {
  export function createClient(config: any): any;
}

declare module '@sanity/image-url' {
  export default function imageUrlBuilder(client: any): {
    image: (source: any) => {
      url: () => string;
      width: (width: number) => any;
      height: (height: number) => any;
    };
  };
} 