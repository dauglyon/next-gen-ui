import { HandWaving } from '@phosphor-icons/react';
import type { LocalPlugin } from '../types';
import { HelloDocument } from './HelloDocument';
import { HelloNavigator } from './HelloNavigator';

export const helloPlugin: LocalPlugin = {
  id: 'hello',
  title: 'Hello',
  icon: HandWaving,
  navigator: HelloNavigator,
  document: HelloDocument,
};
