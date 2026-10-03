// Public-text hygiene shared by the release checks.
import { createHash } from 'node:crypto';

/**
 * Agent and model names, refused as whole words in any case. They are kept as SHA-256
 * digests of the lower-case word, so this public file does not name them itself.
 */
export const NAME_DIGESTS = new Set([
  '71b41d6dd48dc58eba8f5cf9edf30fef6597fdf285a521bb8fcbad4b3d50887d',
  '27037fccea3062ee8ebaea07a9e2bf8dcb6511fd860ae993442aee0c512b8bbf',
  '693b286515bd1dd00865e7b60e4e53556537bbe4b1cc90ab608d94eb7c56fdc6',
  '57de4cf40144bdf7d00010f2f5557a7d642c2b9705309bfade167dd313e2ca93',
  'c857d09db23e6822e3600bc06ad8d58f92ed62bc8efd81c753f77048662cb97d',
  'e12ce8285efc67c6d93d3a122e2589ed95089bcbb775ba5634d94e2b8385db07',
  '09cf980b5ff304ac11b7f6d2c5c263da2a867425798ef5cc5d2ebcf55c4fcd23',
  '8db59feb4d217f26c79d6e76eea6ff80398e8b823e376bb783be870a96cab9e7',
  '970ec274ca867815174ebe4eff19282000f9495a6c7254e94991d1fb4dc3df30',
  '053ea4804ef1bb33d4a3d6fb024a614b6d257cebc2bc7cd915da9c9522f37ffc',
  '444b759c5264422ea582403ae2083d2447fd226a2e40795968dd740e9202cb97',
  'e4f9c522e1c89280e9561b825f4f24fe32b51ff82d61e5c2b1dfd0321c35a90b',
  'add92b9cde2bdbf3daaf65a0db79e9b1a7fa428b71b4d6ce38c742eb6dca0c1c',
  'c9ad8f2cc1294afa0ef22fc2c019ff7243cdd272b2147ddca3f34c5036b05768',
]);
/** The first word of text that is one of those names, or undefined. */
export const namedWord = text => text.split(/[^A-Za-z0-9]+/).find(word => word && NAME_DIGESTS.has(createHash('sha256').update(word.toLowerCase()).digest('hex')));
