import Service from '@ember/service';
import { module, test } from 'qunit';
import type BoardRoute from 'potber-client/routes/authenticated/board';
import { setupTest } from 'potber-client/tests/helpers';

type BoardTransition = Parameters<BoardRoute['model']>[1];

module('Unit | Route | Board', function (hooks) {
  setupTest(hooks);

  test('defaults missing and invalid page parameters to the first page', async function (assert) {
    const board = { id: '14', name: 'Forum' };
    this.owner.register(
      'service:api',
      class extends Service {
        async findBoardById(
          id: string,
          { query }: { query: { page: number } },
        ) {
          assert.step(`${id}/${query.page}`);
          return board;
        }
      },
    );
    const route = this.owner.lookup('route:authenticated/board') as BoardRoute;
    const transition = { from: null } as BoardTransition;

    for (const page of [undefined, 'invalid', '2']) {
      assert.deepEqual(await route.model({ BID: '14', page }, transition), {
        board,
      });
    }

    assert.verifySteps(['14/1', '14/1', '14/2']);
  });

  test('aborts a failed in-app transition but allows a direct visit to show the empty state', async function (assert) {
    this.owner.register(
      'service:api',
      class extends Service {
        async findBoardById() {
          throw new Error('Board unavailable');
        }
      },
    );
    const route = this.owner.lookup('route:authenticated/board') as BoardRoute;
    const abort = () => assert.step('abort');
    const fromHome = {
      from: { name: 'authenticated.home' },
      abort,
    } as BoardTransition;
    const directVisit = { from: null, abort } as BoardTransition;

    assert.strictEqual(await route.model({ BID: '14' }, fromHome), undefined);
    assert.verifySteps(['abort']);
    assert.strictEqual(await route.model({ BID: '14' }, directVisit), null);
    assert.verifySteps([]);
  });
});
