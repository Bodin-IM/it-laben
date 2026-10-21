# IT-laben

Interaktive forklaringer og øvelser for IT-fagene, bygget med SvelteKit.

## Oppdatering og serverdrift

[Kort driftsveiledning](docs/serverdrift.md) med huskeliste for publisering, logger, timer, Nginx og kontroll av publisert versjon. Veiledningen skiller mellom kommandoer på utviklingsmaskinen og på Ubuntu-serveren.

Undervisningssidene ligger under `src/routes`: `/backend`, `/chatrom` og `/sessions`.

En alternativ sessions-side finnes på `/sessions-2-test`: fire korte forsøk med én nettleserprofil, valgfri visning av HTTP-detaljer, ekstra forsøk og kodehjelp. Den opprinnelige siden er tilgjengelig på `/sessions` for sammenligning.

## Svelte-prosjektet

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@1.1.1 create --template minimal --types jsdoc --add prettier --install npm it-laben
```

## Adding features

Add features to your project with `sv add`:

```sh
npx sv add
```

For example, to add Tailwind CSS:

```sh
npx sv add tailwindcss
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
