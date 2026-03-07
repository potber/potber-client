import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';
import SettingsController from 'potber-client/controllers/authenticated/settings';
import type { ConfirmModalOptions } from 'potber-client/components/modal/types/confirm';
import { ModalType } from 'potber-client/services/modal';
import Service from '@ember/service';
import { SidebarLayout } from 'potber-client/services/settings';

module('Integration | Controller | Authenticated | Settings', function (hooks) {
  setupTest(hooks);

  test('should move the sidebar toggle to bottom right', async function (assert) {
    class RendererStub extends Service {
      isDesktop = false;
      updateSidebarLayoutCalls = 0;

      updateSidebarLayout = () => {
        this.updateSidebarLayoutCalls += 1;
      };
    }

    class SettingsStub extends Service {
      sidebarLayout = SidebarLayout.leftTop;

      setSetting(key: string, value: SidebarLayout) {
        if (key === 'sidebarLayout') {
          this.sidebarLayout = value;
        }
      }

      getSetting(key: string) {
        if (key === 'sidebarLayout') {
          return this.sidebarLayout;
        }

        return undefined;
      }
    }

    class ModalStub extends Service {
      activeModal = {
        type: null as ModalType | null,
      };
      confirmCalls: ConfirmModalOptions[] = [];

      confirm(options: ConfirmModalOptions) {
        this.confirmCalls.push(options);
        this.activeModal = { type: ModalType.confirm };
      }
    }

    this.owner.register('service:renderer', RendererStub);
    this.owner.register('service:settings', SettingsStub);
    this.owner.register('service:modal', ModalStub);

    const controller = this.owner.lookup(
      'controller:authenticated.settings',
    ) as SettingsController;
    const renderer = this.owner.lookup('service:renderer') as RendererStub;
    const settings = this.owner.lookup('service:settings') as SettingsStub;
    const modal = this.owner.lookup('service:modal') as ModalStub;

    controller.handleSidebarLayoutSelect({
      label: 'Rechts (unten)',
      data: SidebarLayout.rightBottom,
    });

    assert.strictEqual(settings.sidebarLayout, SidebarLayout.rightBottom);
    assert.strictEqual(renderer.updateSidebarLayoutCalls, 1);
    assert.strictEqual(modal.confirmCalls.length, 0);
  });

  test('should display an information modal when changing the sidebar layout in desktop mode', async function (assert) {
    class RendererStub extends Service {
      isDesktop = true;
      updateSidebarLayout = () => {
        return;
      };
    }

    class ModalStub extends Service {
      activeModal = {
        type: null as ModalType | null,
      };

      confirm() {
        this.activeModal = { type: ModalType.confirm };
      }
    }

    this.owner.register('service:renderer', RendererStub);
    this.owner.register('service:modal', ModalStub);
    const modal = this.owner.lookup('service:modal') as ModalStub;

    const controller = this.owner.lookup(
      'controller:authenticated.settings',
    ) as SettingsController;

    controller.handleSidebarLayoutSelect({
      label: 'RightBottom',
      data: SidebarLayout.rightBottom,
    });

    assert.deepEqual(modal.activeModal.type, ModalType.confirm);
  });
});
