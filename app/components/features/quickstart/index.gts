import Component from '@glimmer/component';
import BoardFavorites from './board-favorites';
import Newsfeed from './newsfeed';

interface Signature {
  Args: {
    inSidebar?: boolean;
  };
}

export default class QuickstartComponent extends Component<Signature> {
  get inSidebar() {
    return this.args.inSidebar ?? false;
  }

  <template>
    <div class='quickstart {{if this.inSidebar "quickstart-sidebar"}}'>
      <Newsfeed @inSidebar={{this.inSidebar}} />
      <hr />
      <BoardFavorites @inSidebar={{this.inSidebar}} />
    </div>
  </template>
}
