import Component from '@glimmer/component';
import Avatar from 'potber-client/components/common/avatar';
import type User from 'potber-client/models/user';
import { appConfig } from 'potber-client/config/app.config';

interface Signature {
  Args: {
    user: User;
  };
}

export default class UserProfileComponent extends Component<Signature> {
  get originalUrl() {
    return `${appConfig.userPageUrl}/${this.args.user.id}`;
  }

  <template>
    <div class='user-profile'>
      {{#if @user.avatarUrl}}
        <Avatar @src={{@user.avatarUrl}} @size='large' class='margin-auto' />
        <hr />
      {{/if}}
      <table>
        <tbody>
          <tr>
            <td>
              <p>Name (ID):</p>
            </td>
            <td class='flex-row'>
              <p><b>{{@user.name}}</b>
                (<a
                  href={{this.originalUrl}}
                  target='_blank'
                  rel='noopener noreferrer'
                >{{@user.id}}</a>)</p>
            </td>
          </tr>
          <tr>
            <td>
              <p>Rang:</p>
            </td>
            <td class='flex-row'>
              <b>{{@user.rank}}</b>
            </td>
          </tr>
          <tr>
            <td>
              <p>Dabei seit:</p>
            </td>
            <td class='flex-row'>
              <b>{{@user.age}}</b>
            </td>
          </tr>
          <tr>
            <td>
              <p>Letzter Login:</p>
            </td>
            <td>
              {{#if @user.lastLogin}}
                <b>{{@user.lastLogin}}</b>
              {{else}}
                <i>privat</i>
              {{/if}}
            </td>
          </tr>
          <tr>
            <td>
              <p>Aktivität:</p>
            </td>
            <td>
              <b>{{@user.activity}}</b>
            </td>
          </tr>
          <tr>
            <td>
              <p>Accountstatus:</p>
            </td>
            <td>
              <b>{{@user.status}}</b>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
}
