/** jsdom has no layout, so `matchMedia` answers from a viewport width the tests choose. */
let width = 1280;

const matches = (query: string) => {
  const min = /min-width:\s*(\d+)px/.exec(query);
  return min ? width >= Number(min[1]) : false;
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    media: query,
    get matches() {
      return matches(query);
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }),
});

export const setViewportWidth = (value: number) => {
  width = value;
};
export const resetViewport = () => {
  width = 1280;
};
