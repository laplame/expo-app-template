/**
 * Debe importarse antes que cualquier módulo que use `useWindowDimensions` desde `react-native`.
 * Los `import` de index.ts se resuelven antes del cuerpo del archivo; el polyfill inline llegaba tarde.
 */
import React from 'react';

const RN = require('react-native') as typeof import('react-native');
const { Dimensions } = RN;

let ok = false;
try {
  ok = typeof RN.useWindowDimensions === 'function';
} catch {
  ok = false;
}

if (!ok) {
  const useWindowDimensionsPolyfill = () => {
    const [dimensions, setDimensions] = React.useState(() => Dimensions.get('window'));
    React.useEffect(() => {
      const sub = Dimensions.addEventListener('change', ({ window }) => {
        setDimensions(window);
      });
      return () => sub.remove();
    }, []);
    return dimensions;
  };
  try {
    Object.defineProperty(RN, 'useWindowDimensions', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: useWindowDimensionsPolyfill,
    });
  } catch {
    // ignore
  }
}
