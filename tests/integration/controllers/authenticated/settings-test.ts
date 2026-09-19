import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';
import SettingsController from 'potber-client/controllers/authenticated/settings';
import type { ConfirmModalOptions } from 'potber-client/components/modal/types/confirm';
import type { InputModalOptions } from 'potber-client/components/modal/types/input';
import { ModalType } from 'potber-client/services/modal';
import Service from '@ember/service';
import { SidebarLayout } from 'potber-client/services/settings';
import { waitUntil } from '@ember/test-helpers';

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

  test('asks which copy to use after validating a differing recovery key', async function (assert) {
    class SettingsStub extends Service {
      getSettings() {
        return { theme: 'local' };
      }
    }

    class SettingsSyncStub extends Service {
      state = 'locked';
      lastError = null;
      validationCalls: string[] = [];

      async unlockHasDifferences(recoveryKey: string) {
        this.validationCalls.push(recoveryKey);
        return true;
      }
    }

    class ModalStub extends Service {
      inputOptions?: InputModalOptions;
      confirmOptions?: ConfirmModalOptions;

      input(options: InputModalOptions) {
        this.inputOptions = options;
      }

      confirm(options: ConfirmModalOptions) {
        this.confirmOptions = options;
      }
    }

    this.owner.register('service:settings', SettingsStub);
    this.owner.register('service:settings-sync', SettingsSyncStub);
    this.owner.register('service:modal', ModalStub);

    const controller = this.owner.lookup(
      'controller:authenticated.settings',
    ) as SettingsController;
    const settingsSync = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    const modal = this.owner.lookup('service:modal') as ModalStub;

    controller.handleUnlockSync();
    modal.inputOptions!.onSubmit?.('recovery-key');
    await waitUntil(() => Boolean(modal.confirmOptions));

    assert.deepEqual(settingsSync.validationCalls, ['recovery-key']);
    assert.strictEqual(modal.confirmOptions!.submitLabel, 'Remote');
    assert.strictEqual(modal.confirmOptions!.alternativeLabel, 'Lokal');
    assert.true(
      modal.confirmOptions!.text.includes(
        'In beiden Fällen werden blockierte Nutzer:innen, gespeicherte Posts und Board-Favoriten zusammengeführt.',
      ),
      'the dialog explains the collection merge',
    );
    assert.strictEqual(modal.confirmOptions!.alternativeVariant, 'error');
    assert.ok(modal.confirmOptions!.onSubmit);
    assert.ok(modal.confirmOptions!.onAlternative);
    assert.false(controller.syncActionBusy);
  });
});
