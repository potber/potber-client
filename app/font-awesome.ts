import { config, library } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';

// Prevent Font Awesome from injecting CSS at runtime. We import the stylesheet explicitly.
config.autoAddCss = false;

library.add(fas, far, fab);
