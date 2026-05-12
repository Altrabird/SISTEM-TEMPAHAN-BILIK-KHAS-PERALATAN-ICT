import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset,
  // Source = the high-res TEMPAH brand image. `npm run icons` reads this
  // and regenerates favicon.ico + the full PWA icon set into public/.
  // Lives outside public/ so the 1.4MB original isn't shipped to clients.
  images: ['logo-source.png'],
});
