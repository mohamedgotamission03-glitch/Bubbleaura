import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

export function configureNativeBranding() {
  const resources = 'android/app/src/main/res';
  if (!existsSync(resources)) throw new Error('Generate the Android project before configuring branding.');
  const config = readFileSync('capacitor.config.ts', 'utf8');
  const name = config.match(/\bappName:\s*'([^']+)'/)?.[1];
  if (!name) throw new Error('Missing Capacitor appName.');
  const escapedName = name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", "\\'").replaceAll('"', '\\"');
  const stringsPath = `${resources}/values/strings.xml`;
  let strings = readFileSync(stringsPath, 'utf8');
  for (const key of ['app_name', 'title_activity_main']) {
    strings = strings.replace(new RegExp(`(<string\\s+name="${key}"[^>]*>)[\\s\\S]*?(</string>)`), `$1${escapedName}$2`);
  }
  writeFileSync(stringsPath, strings);

  // Both launcher variants use the same original artwork as the web icon.
  const svg = readFileSync('public/icon.svg', 'utf8');
  const paths = [...svg.matchAll(/<path\b([^>]*)\/>/g)].map(([, attributes]) => {
    const data = attributes.match(/(?:^|\s)d="([^"]+)"/)?.[1];
    const fill = attributes.match(/(?:^|\s)fill="(#[a-fA-F0-9]{6})"/)?.[1];
    if (!data || !fill) throw new Error('Launcher icon requires filled SVG paths.');
    return { data, fill, background: attributes.includes('data-background="true"') };
  });
  if (!paths.length) throw new Error('Launcher artwork is empty.');
  const vector = entries => `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n${entries.map(path => `  <path android:fillColor="${path.fill}" android:pathData="${path.data}" />`).join('\n')}\n</vector>\n`;
  for (const entry of readdirSync(resources, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('mipmap-')) continue;
    for (const file of readdirSync(`${resources}/${entry.name}`)) {
      if (/^ic_launcher(?:_round)?\.(png|webp|xml)$/.test(file)) rmSync(`${resources}/${entry.name}/${file}`);
    }
  }
  for (const folder of ['drawable', 'mipmap-anydpi', 'mipmap-anydpi-v26']) mkdirSync(`${resources}/${folder}`, { recursive: true });
  writeFileSync(`${resources}/drawable/blockpop_foreground.xml`, vector(paths.filter(path => !path.background)));
  const adaptive = `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/blockpop_icon_background" />\n  <foreground android:drawable="@drawable/blockpop_foreground" />\n</adaptive-icon>\n`;
  for (const icon of ['ic_launcher', 'ic_launcher_round']) {
    writeFileSync(`${resources}/mipmap-anydpi/${icon}.xml`, vector(paths));
    writeFileSync(`${resources}/mipmap-anydpi-v26/${icon}.xml`, adaptive);
  }
  const backgroundFill = paths.find(path => path.background)?.fill ?? '#4cb5e6';
  writeFileSync(`${resources}/values/blockpop_icon.xml`, `<resources><color name="blockpop_icon_background">${backgroundFill}</color></resources>\n`);
  console.log(`Configured ${name} native label and launcher icons.`);
}
