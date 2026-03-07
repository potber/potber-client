import type Transition from '@ember/routing/transition';
import type Post from 'potber-client/models/post';
import type { PostCreateRouteModel } from './create';
import PostCreateRoute from './create';
import { service } from '@ember/service';
import ApiService from 'potber-client/services/api';

interface Params extends Record<string, unknown> {
  TID: string;
  page: number;
  PID: string;
}

export interface PostQuoteRouteModel {
  threadId: string;
  page: number;
  post: Post;
}

export default class PostQuoteRoute extends PostCreateRoute {
  @service declare api: ApiService;

  // We need to tell the route to refresh the model after the query parameters have changed
  queryParams = {
    TID: {
      refreshModel: true,
    },
    PID: {
      refreshModel: true,
    },
    page: {
      refreshModel: true,
    },
  };

  async model(params: Params, transition: Transition) {
    const model = await super.model(params, transition);
    try {
      // Prepare the quote
      const quotedPost = await this.api.quotePost(params.PID);
      (model as PostCreateRouteModel).post.message = quotedPost.message;
      return model;
    } catch (error) {
      transition.abort();
    }
  }
}
