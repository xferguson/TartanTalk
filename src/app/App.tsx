import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemePref } from './theme';

export function App() {
  useThemePref(); // applies the stored theme preference
  return <RouterProvider router={router} />;
}
