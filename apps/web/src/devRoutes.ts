import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { Route as rootRoute } from './routes/__root';

let styleguide: ReturnType<typeof createStyleguideRoute> | undefined;

function createStyleguideRoute() {
  return createRoute({
    getParentRoute: () => rootRoute,
    path: '/__styleguide',
    component: lazyRouteComponent(() => import('./features/styleguide/Styleguide')),
  });
}

/**
 * Adds the dev-only routes (the `/__styleguide` component gallery) to the route tree.
 * `router.ts` calls this only under `import.meta.env.DEV`; Vite replaces that with `false`
 * in a production build, so this function, the route and its dynamic import are dropped and
 * no styleguide chunk is emitted.
 */
export function withDevRoutes<
  T extends { children?: unknown; addChildren: (children: never[]) => unknown },
>(tree: T): T {
  if (styleguide) return tree;
  styleguide = createStyleguideRoute();
  const children = Array.isArray(tree.children) ? tree.children : [];
  tree.addChildren([...children, styleguide] as never[]);
  return tree;
}
