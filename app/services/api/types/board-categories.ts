import { Boards } from '.';

export interface Read {
  id: string;
  name: string;
  description: string;
  boards: Boards.Read[];
}
