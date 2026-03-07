import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import Button from 'potber-client/components/common/control/button';
import BoardPost from 'potber-client/components/board/post';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import { Posts, Threads } from 'potber-client/services/api/types';
import CustomSession from 'potber-client/services/custom-session';
import ModalService from 'potber-client/services/modal';

export interface PostPreviewModalOptions {
  post: Posts.Write | Threads.OpeningPost;
}

interface Signature {
  Args: {
    options: PostPreviewModalOptions;
  };
}

export default class PostPreviewModalComponent extends Component<Signature> {
  @service declare modal: ModalService;
  @service declare session: CustomSession;

  get preview(): Posts.Read {
    const { post } = this.args.options;
    const preview: Posts.Read = {
      id: 'preview',
      boardId: 'preview',
      threadId: 'threadId' in post ? post.threadId : 'preview',
      message: post.message,
      title: post.title,
      icon: post.icon,
      date: new Date().toISOString(),
      author: {
        id: this.session.sessionData?.userId ?? '',
        name: this.session.sessionData?.username,
      },
      avatarUrl: this.session.sessionData?.avatarUrl,
    };
    return preview;
  }

  @action handleClose() {
    this.modal.close();
  }

  <template>
    <ModalHeader @title='Vorschau' @icon='eye' />
    <ModalContent>
      <BoardPost @post={{this.preview}} @disableMenu={{true}} />
    </ModalContent>
    <ModalFooter>
      <Button
        @text='Schließen'
        @variant='secondary-transparent'
        @size='small'
        @onClick={{this.handleClose}}
      />
    </ModalFooter>
  </template>
}
