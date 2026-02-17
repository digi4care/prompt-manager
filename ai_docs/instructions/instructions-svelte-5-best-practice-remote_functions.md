  Je moet ze expliciet inschakelen in je svelte.config.js:

  import { sveltekit } from '@sveltejs/kit/vite';

  /** @type {import('@sveltejs/kit').Config} */
  const config = {
    kit: {
      experimental: {
        remoteFunctions: true
      }
    },
    compilerOptions: {
      experimental: {
        async: true  // Voor await in componenten
      }
    }
  };

  export default config;

  Vier types Remote Functions

  1. query - Data lezen van de server

  Voor het ophalen van dynamische data:

  // src/routes/blog/data.remote.js
  import { query } from '$app/server';
  import * as db from '$lib/server/database';

  export const getPosts = query(async () => {
    const posts = await db.sql`
      SELECT title, slug
      FROM post
      ORDER BY published_at DESC
    `;
    return posts;
  });

  Gebruik in een component:
  <script>
    import { getPosts } from './data.remote';
  </script>

  <h1>Recente berichten</h1>

  <ul>
    {#each await getPosts() as { title, slug }}
      <li><a href="/blog/{slug}">{title}</a></li>
    {/each}
  </ul>

  Query argumenten en validatie:
  import { z } from 'zod';

  const getPostSchema = z.object({
    slug: z.string().min(1)
  });

  export const getPost = query(getPostSchema, async ({ slug }) => {
    // Server-side data ophalen
    const post = await db.getPost(slug);
    return post;
  });

  Batching (query.batch):
  Meerdere queries tegelijk bundelen om het n+1 probleem op te lossen.

  2. form - Data schrijven naar de server

  Eenvoudig formulieren maken met validatie:

  import { z } from 'zod';
  import { form } from '$app/server';

  const createPostSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1)
  });

  export const createPost = form(createPostSchema, async ({ data }) => {
    // Verwerk de data
    await db.createPost(data.title, data.content);

    // Redirect naar nieuwe post
    return redirect(303, `/blog/${data.slug}`);
  });

  Gebruik in component:
  <script>
    import { createPost } from './actions.remote';
  </script>

  <form {...createPost.form}>
    <input {...createPost.fields.title.as('text')} />
    <textarea {...createPost.fields.content.as('textarea')} />
    <button type="submit">Publiceren</button>
  </form>

  Kenmerken:
  - Werkt zonder JavaScript (native form submission)
  - Progressive enhancement met JavaScript
  - Automatische validatie en foutafhandeling
  - Toegankelijkheid (aria-invalid)
  - Formulierwaarden behouden bij mislukte submit

  3. command - Server-side acties

  Voor het uitvoeren van acties die geen formulier vereisen:

  import { z } from 'zod';
  import { command } from '$app/server';

  const addLikeSchema = z.object({
    itemId: z.string()
  });

  export const addLike = command(addLikeSchema, async ({ data }) => {
    await db.addLike(data.itemId);

    // Specificeer welke queries te verversen
    return {
      updates: ['getLikes']
    };
  });

  Aanroepen vanuit een event handler:
  <button on:click={() => addLike({ itemId })}>
    Like ({getLikes(itemId).current})
  </button>

  4. prerender - Build-time data ophalen

  Voor statische data die zelden verandert:

  import { prerender } from '$app/server';

  export const getStaticData = prerender(async () => {
    const config = await db.getSiteConfig();
    return config;
  });

  Deze data wordt gebuild-time gegenereerd en kan op een CDN worden geplaatst voor zeer snelle navigatie.

  Belangrijke voordelen

  1. Type Safety: Volledige TypeScript ondersteuning met automatische validatie
  2. Eenvoud: Geen complexe API endpoints meer nodig
  3. Optimistic Updates: Directe UI updates terwijl data verstuurd wordt
  4. Progressive Enhancement: Werkt zonder JavaScript
  5. Automatische Cache: Queries worden automatisch gecacht
  6. Svelte Boundaries: Integratie met <svelte:boundary> voor foutafhandeling
  7. Await Support: Direct await gebruiken in componenten (experimenteel)

  Combineer met await expressies

  Met compilerOptions.experimental.async kun je direct await gebruiken in je templates:

  {#each await getPosts() as post}
    <article>{post.title}</article>
  {/each}

