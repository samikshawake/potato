import React, { createContext, useContext, useState, useCallback } from 'react';

interface RouterContextValue {
  pathname: string;
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
}

const RouterContext = createContext<RouterContextValue>({
  pathname: '/',
  push: () => {},
  replace: () => {},
  back: () => {},
});

export function normalizeRoute(href: string): string {
  if (!href || href === '/' || href === '/index' || href === 'index') return '/';
  const clean = href.startsWith('/') ? href : `/${href}`;
  return clean.replace(/\/+$/, '') || '/';
}

export const ExpoRouterProvider: React.FC<{
  initialRoute?: string;
  children: React.ReactNode;
}> = ({ initialRoute = '/', children }) => {
  const [history, setHistory] = useState<string[]>([normalizeRoute(initialRoute)]);

  const pathname = history[history.length - 1] || '/';

  const push = useCallback((href: string) => {
    const target = normalizeRoute(href);
    setHistory((prev) => {
      if (prev[prev.length - 1] === target) return prev;
      return [...prev, target];
    });
  }, []);

  const replace = useCallback((href: string) => {
    const target = normalizeRoute(href);
    setHistory((prev) => [...prev.slice(0, -1), target]);
  }, []);

  const back = useCallback(() => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['/']));
  }, []);

  return (
    <RouterContext.Provider value={{ pathname, push, replace, back }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  return useContext(RouterContext);
}

export function usePathname() {
  return useContext(RouterContext).pathname;
}

const StackComponent: React.FC<any> & { Screen: React.FC<{ name: string; options?: any }> } = ({
  children,
}) => <>{children}</>;

StackComponent.Screen = () => null;

export const Stack = StackComponent;
