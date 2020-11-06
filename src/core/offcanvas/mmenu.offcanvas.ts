import Mmenu from './../oncanvas/mmenu.oncanvas';
import options from './_options';
import configs from './_configs';
import * as DOM from '../../_modules/dom';
import * as sr from '../../_modules/screenreader';
import {
    extend,
    uniqueId,
    originalId,
} from '../../_modules/helpers';

//  Add the options and configs.
Mmenu.options.offCanvas = options;
Mmenu.configs.offCanvas = configs;

export default function (this: Mmenu) {

    const options = this.opts.offCanvas;
    const configs = this.conf.offCanvas;

    this.opts.searchfield = extend(options, Mmenu.options.searchfield);

    if (!options.use) {
        return;
    }

    //	Add methods to the API.
    this._api.push('open', 'close', 'setPage');

    //	Add off-canvas behavior.
    this.bind('initMenu:before', () => {
        //	Clone if needed.
        if (configs.clone) {
            //	Clone the original menu and store it.
            this.node.menu = this.node.menu.cloneNode(true) as HTMLElement;

            //	Prefix all ID's in the cloned menu.
            if (this.node.menu.id) {
                this.node.menu.id = 'mm-' + this.node.menu.id;
            }
            DOM.find(this.node.menu, '[id]').forEach((elem) => {
                elem.id = 'mm-' + elem.id;
            });
        }

        this.node.wrpr = document.body;

        //	Prepend to the <body>
        document.querySelector(configs.menu.insertSelector)[configs.menu.insertMethod](this.node.menu);
    });

    this.bind('initMenu:after', () => {
        //	Setup the UI blocker.
        initBlocker.call(this);

        //	Setup the page.
        this.setPage(Mmenu.node.page);

        //	Setup window events.
        initWindow.call(this);

        //	Setup the menu.
        this.node.menu.classList.add('mm-menu--offcanvas');

        //	Open if url hash equals menu id (usefull when user clicks the hamburger icon before the menu is created)
        let hash = window.location.hash;
        if (hash) {
            let id = originalId(this.node.menu.id);
            if (id && id == hash.slice(1)) {
                setTimeout(() => {
                    this.open();
                }, 1000);
            }
        }
    });

    //	Add screenreader / aria support
    this.bind('initMenu:after', () => {
        sr.aria(this.node.menu, 'hidden', true);
        sr.aria(Mmenu.node.blck, 'hidden', true);
    });

    this.bind('open:after', () => {
        sr.aria(this.node.menu, 'hidden', false);
        sr.aria(Mmenu.node.blck, 'hidden', false);
    });

    this.bind('close:after', () => {
        sr.aria(this.node.menu, 'hidden', true);
        sr.aria(Mmenu.node.blck, 'hidden', true);
    });

    document.addEventListener('click', event => {

        /** THe href attribute for the clicked anchor. */
        const href = (event.target as HTMLElement).closest('a')?.getAttribute('href');

        switch (href) {
            //	Open menu if the clicked anchor links to the menu.
            case `#${originalId(this.node.menu.id)}`:
                event.preventDefault();
                this.open();
                break;

            //	Close menu if the clicked anchor links to the page.
            case `#${originalId(Mmenu.node.page.id)}`:
                event.preventDefault();
                this.close();
                break;
        }
    });
}

/**
 * Open the menu.
 */
Mmenu.prototype.open = function (this: Mmenu) {
    if (this.node.menu.matches('.mm-menu--opened')) {
        return;
    }

    //	Invoke "before" hook.
    this.trigger('open:before');

    var clsn = ['mm-wrapper--opened'];

    this.node.wrpr.classList.add(...clsn);

    //	Open
    this.node.menu.classList.add('mm-menu--opened');
    this.node.wrpr.classList.add('mm-wrapper--opened');

    //	Invoke "after" hook.
    this.trigger('open:after');
};

Mmenu.prototype.close = function (this: Mmenu) {
    if (!this.node.menu.matches('.mm-menu--opened')) {
        return;
    }

    //	Invoke "before" hook.
    this.trigger('close:before');

    this.node.menu.classList.remove('mm-menu--opened');
    this.node.wrpr.classList.remove('mm-wrapper--opened');

    //	Invoke "after" hook.
    this.trigger('close:after');
};

/**
 * Set the "page" node.
 *
 * @param {HTMLElement} page Element to set as the page.
 */
Mmenu.prototype.setPage = function (this: Mmenu, page: HTMLElement) {

    var configs = this.conf.offCanvas;

    //	If no page was specified, find it.
    if (!page) {
        /** Array of elements that are / could be "the page". */
        let pages =
            typeof configs.page.selector == 'string'
                ? DOM.find(document.body, configs.page.selector)
                : DOM.children(document.body, configs.page.nodetype);

        //	Filter out elements that are absolutely not "the page".
        pages = pages.filter(
            (page) => !page.matches('.mm-menu, .mm-wrapper__blocker')
        );

        //	Filter out elements that are configured to not be "the page".
        if (configs.page.noSelector.length) {
            pages = pages.filter(
                (page) => !page.matches(configs.page.noSelector.join(', '))
            );
        }

        //	Wrap multiple pages in a single element.
        if (pages.length > 1) {
            let wrapper = DOM.create('div');
            pages[0].before(wrapper);
            pages.forEach((page) => {
                wrapper.append(page);
            });

            pages = [wrapper];
        }

        page = pages[0];
    }

    //	Invoke "before" hook.
    this.trigger('setPage:before', [page]);

    page.classList.add('mm-page', 'mm-slideout');

    page.id = page.id || uniqueId();

    Mmenu.node.page = page;

    //	Invoke "after" hook.
    this.trigger('setPage:after', [page]);
};

/**
 * Initialize the window.
 */
const initWindow = function (this: Mmenu) {
    //	Prevent tabbing
    //	Because when tabbing outside the menu, the element that gains focus will be centered on the screen.
    //	In other words: The menu would move out of view.
    // events.off(document.body, 'keydown.tabguard');
    // events.on(document.body, 'keydown.tabguard', (evnt: KeyboardEvent) => {
    //     if (evnt.keyCode == 9) {
    //         if (this.node.wrpr.matches('.mm-wrapper--opened')) {
    //             evnt.preventDefault();
    //         }
    //     }
    // });
};

/**
 * Initialize "blocker" node
 */
const initBlocker = function (this: Mmenu) {

    const configs = this.conf.offCanvas;

    //	Invoke "before" hook.
    this.trigger('initBlocker:before');

    //	Create the blocker node.
    if (!Mmenu.node.blck) {
        const blck = DOM.create('div.mm-wrapper__blocker.mm-slideout');
        blck.innerHTML = `<a>${sr.text(
            this.i18n(this.conf.screenReader.text.closeMenu)
        )}</a>`;

        //	Append the blocker node to the body.
        document.querySelector(configs.menu.insertSelector).append(blck);

        //	Store the blocker node.
        Mmenu.node.blck = blck;
    }

    //	Sync the blocker to target the page.
    this.bind('setPage:after', (page: HTMLElement) => {
        DOM.children(Mmenu.node.blck, 'a').forEach((anchor) => {
            anchor.setAttribute('href', '#' + page.id);
        });
    });

    //	Invoke "after" hook.
    this.trigger('initBlocker:after');
};
