export type Platform = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export type BrandBible = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  typography: {
    fontFamily: string;
    headingSize: number;
    bodySize: number;
    fontWeight: 'light' | 'normal' | 'bold';
  };
  layout: {
    margin: number;
    padding: number;
    borderRadius: number;
  };
  tone: string;
  rules: string[];
};

export type UploadedAssets = {
  productImages: string[];
  styleReferences: string[];
  fonts: string[];
  icons: string[];
};

export type GenerateRequest = {
  platform: Platform;
  brandBible: BrandBible;
  uploadedAssets: UploadedAssets;
  prompt: string;
};

export type Creative = {
  id: string;
  png: string; // base64 encoded PNG
  platform: string;
  status: 'success' | 'error';
  error?: string;
};

export type CompositorInput = {
  platform: Platform;
  brandBible: BrandBible;
  uploadedAssets: UploadedAssets;
  prompt: string;
};
