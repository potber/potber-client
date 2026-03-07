import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import Button from 'potber-client/components/common/control/button';
import FeatureUserProfile from 'potber-client/components/features/user-profile';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import { Users } from 'potber-client/services/api/types';
import ModalService from 'potber-client/services/modal';

export interface UserProfileModalOptions {
  user: Users.Read;
}

interface Signature {
  Args: {
    options: UserProfileModalOptions;
  };
}

export default class UserProfileModalComponent extends Component<Signature> {
  @service declare modal: ModalService;

  get title() {
    return this.args.options.user.name ?? 'Unbekannt';
  }

  @action handleClose() {
    this.modal.close();
  }

  <template>
    <ModalHeader @title={{this.title}} @icon='user' />
    <ModalContent>
      <FeatureUserProfile @user={{@options.user}} />
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
