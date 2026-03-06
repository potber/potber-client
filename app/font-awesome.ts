import { config, library } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import * as freeBrandsIcons from '@fortawesome/free-brands-svg-icons';
import * as freeRegularIcons from '@fortawesome/free-regular-svg-icons';
import * as freeSolidIcons from '@fortawesome/free-solid-svg-icons';

// Prevent Font Awesome from injecting CSS at runtime. We import the stylesheet explicitly.
config.autoAddCss = false;

library.add(
  freeSolidIcons.fas,
  freeRegularIcons.far,
  freeBrandsIcons.fab,
);
