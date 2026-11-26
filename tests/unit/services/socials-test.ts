import { module, test } from 'qunit';
import LocalStorageService from 'potber-client/services/local-storage';
import type { Socials } from 'potber-client/services/socials';
import SocialsService from 'potber-client/services/socials';
import { setupTest } from 'potber-client/tests/helpers';

module('Unit | Service | Socials', function (hooks) {
  setupTest(hooks);

  test('loads blocked users from local storage', function (assert) {
    const storedSocials: Socials = {
      blockedUsers: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
    };

    class LocalStorageStub extends LocalStorageService {
      readSocials(): Socials {
        return storedSocials;
      }
    }

    this.owner.register('service:local-storage', LocalStorageStub);

    const socials = this.owner.lookup('service:socials') as SocialsService;

    assert.deepEqual(socials.load(), storedSocials);
    assert.deepEqual(socials.blockedUsers, storedSocials.blockedUsers);
  });

  test('unblockUser only removes the matching user', function (assert) {
    let savedSocials: Socials | null = null;

    class LocalStorageStub extends LocalStorageService {
      readSocials(): Socials {
        return {
          blockedUsers: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        };
      }

      writeSocials(socials: Socials): void {
        savedSocials = JSON.parse(JSON.stringify(socials)) as Socials;
      }
    }

    this.owner.register('service:local-storage', LocalStorageStub);

    const socials = this.owner.lookup('service:socials') as SocialsService;
    socials.load();
    socials.unblockUser('1');

    assert.deepEqual(socials.blockedUsers, [{ id: '2', name: 'Bob' }]);
    assert.deepEqual(savedSocials, {
      blockedUsers: [{ id: '2', name: 'Bob' }],
    });
  });

  test('unblockUser ignores unknown users', function (assert) {
    let writeCalls = 0;

    class LocalStorageStub extends LocalStorageService {
      readSocials(): Socials {
        return {
          blockedUsers: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        };
      }

      writeSocials(): void {
        writeCalls += 1;
      }
    }

    this.owner.register('service:local-storage', LocalStorageStub);

    const socials = this.owner.lookup('service:socials') as SocialsService;
    socials.load();
    socials.unblockUser('missing');

    assert.deepEqual(socials.blockedUsers, [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
    assert.strictEqual(writeCalls, 0);
  });

  test('keeps the original entry when the same user is blocked again', function (assert) {
    class LocalStorageStub extends LocalStorageService {
      readSocials(): Socials {
        return { blockedUsers: [{ id: '1', name: 'Alice' }] };
      }

      writeSocials(): void {
        assert.step('unexpected write');
      }
    }

    this.owner.register('service:local-storage', LocalStorageStub);
    const socials = this.owner.lookup('service:socials') as SocialsService;

    socials.load();
    socials.blockUser('1', 'Another name');

    assert.deepEqual(socials.blockedUsers, [{ id: '1', name: 'Alice' }]);
    assert.true(socials.isUserBlocked('1'));
    assert.true(socials.isUserBlocked('Alice'));
    assert.false(socials.isUserBlocked('Another name'));
    assert.verifySteps([]);
  });
});
