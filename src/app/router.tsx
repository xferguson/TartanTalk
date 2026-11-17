import { createHashRouter } from 'react-router-dom';
import { Layout } from '../ui/components/Layout';
import { ShelfScreen } from '../ui/screens/Shelf/ShelfScreen';
import { ScarfScreen } from '../ui/screens/Scarf/ScarfScreen';
import { LoomScreen } from '../ui/screens/Loom/LoomScreen';
import { ReweaveScreen } from '../ui/screens/Reweave/ReweaveScreen';
import { TanglesScreen } from '../ui/screens/Tangles/TanglesScreen';
import { LibraryScreen } from '../ui/screens/Library/LibraryScreen';
import { NewScarfScreen } from '../ui/screens/NewScarf/NewScarfScreen';
import { SettingsScreen } from '../ui/screens/Settings/SettingsScreen';

/** All routes are registered here once, so screen tasks only edit their own folder. */
export const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <ShelfScreen /> },
      { path: '/scarf/:id', element: <ScarfScreen /> },
      { path: '/loom', element: <LoomScreen /> },
      { path: '/loom/:scarfId', element: <LoomScreen /> },
      { path: '/reweave/:scarfId', element: <ReweaveScreen /> },
      { path: '/tangles', element: <TanglesScreen /> },
      { path: '/library', element: <LibraryScreen /> },
      { path: '/new', element: <NewScarfScreen /> },
      { path: '/settings', element: <SettingsScreen /> },
    ],
  },
]);
