/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import AlarmChallengeRoot from './screens/AlarmChallengeRoot';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('alarm_challenge', () => AlarmChallengeRoot);
