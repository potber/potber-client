import Component from '@glimmer/component';
import type { TrackedState } from 'ember-resources';
import BoardPost from 'potber-client/components/board/post';
import SkeletonPost from 'potber-client/components/routes/thread/skeleton-post';
import type { Threads } from 'potber-client/services/api/types';

interface Signature {
  Args: {
    threadState: TrackedState<Threads.Read>;
  };
}

export default class RecentPosts extends Component<Signature> {
  get thread() {
    return this.args.threadState.value;
  }

  get posts() {
    const posts = this.thread?.page?.posts;
    return posts ? [...posts].reverse() : [];
  }

  <template>
    <div class='flex-column'>
      {{#if this.thread}}
        {{#each this.posts as |post|}}
          <BoardPost
            @post={{post}}
            @thread={{this.thread}}
            @subtle={{true}}
            @disableMenu={{true}}
          />
        {{/each}}
      {{else}}
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
      {{/if}}
    </div>
  </template>
}
