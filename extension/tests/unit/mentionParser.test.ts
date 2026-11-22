import { parseMentions } from '../../src/context/mentionParser';

test('parses file and symbol mentions', () => {
  expect(parseMentions('@file:src/app.py fix @symbol:get_debug_flag')).toEqual([
    { term: 'src/app.py', path: 'src/app.py', signal: 'explicit_mention' },
    { term: 'get_debug_flag', signal: 'pinned_symbol' },
  ]);
});
