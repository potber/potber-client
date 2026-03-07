import { service } from '@ember/service';
import { htmlSafe } from '@ember/template';
import Component from '@glimmer/component';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import Avatar from 'potber-client/components/common/avatar';
import { PrivateMessage } from 'potber-client/services/api/models/private-message';
import ContentParserService from 'potber-client/services/content-parser';
import { getPrivateMessageFolderLabel } from 'potber-client/utils/private-messages';

interface Signature {
  Args: {
    message: PrivateMessage;
  };
}

export default class PrivateMessagesViewComponent extends Component<Signature> {
  @service declare contentParser: ContentParserService;

  get sender() {
    return this.args.message.sender;
  }

  get recipient() {
    return this.args.message.recipient;
  }

  get folder() {
    return getPrivateMessageFolderLabel(this.args.message.folder);
  }

  get content() {
    const content = this.contentParser.parsePrivateMessageContent(
      this.args.message.content || '',
    );
    return htmlSafe(content);
  }

  <template>
    {{#unless @message.isDeleted}}
      <div class='private-message-view'>
        <div class='private-message-view-header'>
          {{#if this.sender}}
            {{#if this.sender.avatarUrl}}
              <Avatar
                @src={{this.sender.avatarUrl}}
                @size='large'
                @userId={{this.sender.id}}
                class='margin-auto'
              />
              <hr />
            {{/if}}
          {{/if}}
          <div>
            <table>
              <tbody>
                <tr>
                  <td>
                    <p>Betreff: </p>
                  </td>
                  <td class='flex-row'>
                    <p><b>{{@message.title}}</b></p>
                  </td>
                </tr>
                {{#if this.sender}}
                  <tr>
                    <td>
                      <p>Absender: </p>
                    </td>
                    <td class='flex-row'>
                      <p><b>{{this.sender.name}}</b></p>
                    </td>
                  </tr>
                {{/if}}
                {{#if this.recipient}}
                  <tr>
                    <td>
                      <p>Empfänger: </p>
                    </td>
                    <td class='flex-row'>
                      <p><b>{{this.recipient.name}}</b></p>
                    </td>
                  </tr>
                {{/if}}
                <tr>
                  <td>
                    <p>Gesendet: </p>
                  </td>
                  <td class='flex-row'>
                    <p><b>{{@message.date}}</b></p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p>Ordner: </p>
                  </td>
                  <td class='flex-row'>
                    <p><b>{{this.folder}}</b></p>
                  </td>
                </tr>
              </tbody>
            </table>
            {{#if @message.important}}
              <div class='private-message-view-tag-important'>
                <FaIcon @icon='circle-exclamation' />
                Wichtige Nachricht!
              </div>
            {{/if}}
          </div>
        </div>
        <div class='private-message-view-content'>
          <p>{{this.content}}</p>
        </div>
      </div>
    {{/unless}}
  </template>
}
