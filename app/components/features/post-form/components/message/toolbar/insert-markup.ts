import type { Posts, Threads } from 'potber-client/services/api/types';
import type ModalService from 'potber-client/services/modal';

export interface MarkupControlSignature {
  Args: {
    post: Posts.Write | Threads.OpeningPost;
    textarea: HTMLTextAreaElement;
  };
}

export function insertMarkup(
  post: MarkupControlSignature['Args']['post'],
  textarea: HTMLTextAreaElement,
  markup: string,
  modal: ModalService,
): void {
  const message = post.message || '';
  const selectionEnd = textarea.selectionEnd;
  post.message =
    message.slice(0, selectionEnd) + markup + message.slice(selectionEnd);
  textarea.value = post.message;

  void modal.close(() => {
    const caret = selectionEnd + markup.length;
    textarea.select();
    textarea.setSelectionRange(caret, caret);
  });
}
