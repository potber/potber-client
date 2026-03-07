import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import t from 'ember-intl/helpers/t';
import Button from 'potber-client/components/common/control/button';
import Dropdown from 'potber-client/components/common/control/dropdown';
import Input from 'potber-client/components/common/control/input';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import ModalService from 'potber-client/services/modal';

export interface ListModalOptions {
  onSubmit: (type: ListType, entries: string[]) => void;
}

export enum ListType {
  Empty = 'empty',
  Numerical = 'numerical',
  Alphabetical = 'alphabetical',
}

interface Signature {
  Args: {
    options: ListModalOptions;
  };
}

interface ListTypeOption {
  label: string;
  data: ListType;
}

export default class ListModelComponent extends Component<Signature> {
  @service declare modal: ModalService;

  @tracked hasRemoveableEntries = false;
  @tracked entries = [''];

  selectedListType = ListType.Empty;
  listTypes: ListTypeOption[] = [
    {
      label: 'Leer',
      data: ListType.Empty,
    },
    {
      label: 'Nummeriert',
      data: ListType.Numerical,
    },
    {
      label: 'Alphabetisch',
      data: ListType.Alphabetical,
    },
  ];

  @action handleTextChange(index: number, value: string) {
    this.entries[index] = value;
  }

  @action handleAdd(index: number) {
    const start = this.entries.slice(0, index + 1);
    const end = this.entries.slice(index + 1);
    this.entries = [...start, '', ...end];
    this.hasRemoveableEntries = true;
  }

  @action handleRemove(index: number) {
    const start = this.entries.slice(0, index);
    const end = this.entries.slice(index + 1);
    this.entries = [...start, ...end];

    if (this.entries.length === 1) {
      this.hasRemoveableEntries = false;
    }
  }

  @action handleTypeSelect(value: ListTypeOption) {
    this.selectedListType = value.data;
  }

  @action handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    this.args.options.onSubmit(this.selectedListType, this.entries);
  }

  @action handleCancel() {
    this.modal.close();
  }

  <template>
    <ModalHeader
      @title={{t 'feature.post-form.message.toolbar.list.modal.title'}}
      @icon='list'
    />
    <ModalContent>
      <form id='list-modal-form' {{on 'submit' this.handleSubmit}}>
        <Dropdown
          @options={{this.listTypes}}
          @onSelect={{this.handleTypeSelect}}
          @size='max'
          @label={{t 'feature.post-form.message.toolbar.list.modal.type'}}
        />
        {{#each this.entries key='@index' as |text index|}}
          <div class='list-modal-entry'>
            <Input
              @label={{t 'feature.post-form.message.toolbar.list.modal.entry'}}
              @size='max'
              @value={{text}}
              @onChange={{fn this.handleTextChange index}}
              @selectAllOnFocus={{true}}
              @required={{true}}
              type='text'
            />
            {{#if this.hasRemoveableEntries}}
              <Button
                @icon='minus'
                @type='button'
                @variant='primary'
                @size='square'
                @onClick={{fn this.handleRemove index}}
                form='list-modal-form'
              />
            {{/if}}
            <Button
              @type='button'
              @variant='primary'
              @icon='plus'
              @size='square'
              @onClick={{fn this.handleAdd index}}
              form='list-modal-form'
            />
          </div>
        {{/each}}
      </form>
    </ModalContent>
    <ModalFooter>
      <Button
        @text='Schließen'
        @variant='secondary-transparent'
        @size='small'
        @onClick={{this.handleCancel}}
      />
      <Button
        @text='OK'
        @type='submit'
        @variant='primary'
        @size='small'
        form='list-modal-form'
      />
    </ModalFooter>
  </template>
}
