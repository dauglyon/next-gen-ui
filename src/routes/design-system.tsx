import { createFileRoute } from '@tanstack/react-router';
import * as Toast from '@dauglyon/design-system/components/Toast';

import { Showcase } from '@dauglyon/design-system/Showcase';

export const Route = createFileRoute('/design-system')({
  component: DesignSystemPage,
  staticData: { title: 'Design system' },
});

function DesignSystemPage() {
  return (
    <Toast.Provider>
      <Showcase />
      <Toast.Viewport />
    </Toast.Provider>
  );
}
