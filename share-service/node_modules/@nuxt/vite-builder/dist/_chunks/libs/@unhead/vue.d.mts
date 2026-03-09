import { ComputedRef } from "vue";

//#region ../../node_modules/.pnpm/hookable@6.0.1/node_modules/hookable/dist/index.d.mts
type CreateTask = (name?: string) => {
  run: (function_: () => Promise<any> | any) => Promise<any> | any;
};
declare global {
  interface Console {
    createTask?: CreateTask;
  }
}
/** @deprecated */
//#endregion
//#region ../../node_modules/.pnpm/unhead@2.1.3/node_modules/unhead/dist/shared/unhead.BUCuVRIf.d.ts
type Booleanable = boolean | 'false' | 'true' | '';
type Stringable = string | Booleanable | number;
type Falsy = false | null | undefined;
type ResolvableValue<T> = T | Falsy | (() => (T | Falsy));
type ResolvableProperties<T> = { [key in keyof T]?: ResolvableValue<T[key]> };
interface DataKeys {
  [key: `data-${string}`]: Stringable;
}
interface HttpEventAttributes {
  /**
   * Script to be run on abort
   */
  onabort?: string;
  /**
   * Script to be run when an error occurs when the file is being loaded
   */
  onerror?: string;
  /**
   * Script to be run when the file is loaded
   */
  onload?: string;
  /**
   * The progress event is fired periodically when a request receives more data.
   */
  onprogress?: string;
  /**
   * Script to be run just as the file begins to load before anything is actually loaded
   */
  onloadstart?: string;
}
interface Base {
  /**
   * The base URL to be used throughout the document for relative URLs. Absolute and relative URLs are allowed.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base#attr-href
   */
  href?: string;
  /**
   * A keyword or author-defined name of the default browsing context to show the results of navigation from `<a>`,
   * `<area>`, or `<form>` elements without explicit target attributes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base#attr-target
   */
  target?: string;
}
interface GlobalAttributes {
  /**
   * Provides a hint for generating a keyboard shortcut for the current element. This attribute consists of a
   * space-separated list of characters. The browser should use the first one that exists on the computer keyboard layout.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/accesskey
   */
  accesskey?: string;
  /**
   * Controls whether and how text input is automatically capitalized as it is entered/edited by the user.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autocapitalize
   */
  autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  /**
   * Indicates that an element is to be focused on page load, or as soon as the `<dialog>` it is part of is displayed.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autofocus
   */
  autofocus?: Booleanable;
  /**
   * A space-separated list of the classes of the element. Classes allows CSS and JavaScript to select and access
   * specific elements via the class selectors or functions like the method Document.getElementsByClassName().
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: Stringable;
  /**
   * An enumerated attribute indicating if the element should be editable by the user.
   * If so, the browser modifies its widget to allow editing.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable
   */
  contenteditable?: Booleanable;
  /**
   * An enumerated attribute indicating the directionality of the element's text.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir
   */
  dir?: 'ltr' | 'rtl' | 'auto';
  /**
   * An enumerated attribute indicating whether the element can be dragged, using the Drag and Drop API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/draggable
   */
  draggable?: Booleanable;
  /**
   * Hints what action label (or icon) to present for the enter key on virtual keyboards.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/enterkeyhint
   */
  enterkeyhint?: string;
  /**
   * Used to transitively export shadow parts from a nested shadow tree into a containing light tree.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/exportparts
   */
  exportparts?: string;
  /**
   * A Boolean attribute indicates that the element is not yet, or is no longer, relevant.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden
   */
  hidden?: Booleanable;
  /**
   * The id global attribute defines a unique identifier (ID) which must be unique in the whole document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id
   */
  id?: string;
  /**
   * Provides a hint to browsers as to the type of virtual keyboard configuration to use when editing this element or its contents.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode
   */
  inputmode?: string;
  /**
   * Allows you to specify that a standard HTML element should behave like a registered custom built-in element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/is
   */
  is?: string;
  /**
   * The unique, global identifier of an item.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemid
   */
  itemid?: string;
  /**
   * Used to add properties to an item.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemprop
   */
  itemprop?: string;
  /**
   * Properties that are not descendants of an element with the itemscope attribute can be associated with the item using an itemref.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemref
   */
  itemref?: string;
  /**
   * itemscope (usually) works along with itemtype to specify that the HTML contained in a block is about a particular item.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemscope
   */
  itemscope?: string;
  /**
   * Specifies the URL of the vocabulary that will be used to define itemprops (item properties) in the data structure.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemtype
   */
  itemtype?: string;
  /**
   * Helps define the language of an element: the language that non-editable elements are in, or the language
   * that editable elements should be written in by the user.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang
   */
  lang?: string;
  /**
   * A cryptographic nonce ("number used once") which can be used by Content Security Policy to determine whether or not
   * a given fetch will be allowed to proceed.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/nonce
   */
  nonce?: string;
  /**
   * A space-separated list of the part names of the element. Part names allows CSS to select and style specific elements
   * in a shadow tree via the ::part pseudo-element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part
   */
  part?: string;
  /**
   * Assigns a slot in a shadow DOM shadow tree to an element: An element with a slot attribute is assigned to the slot
   * created by the `<slot>` element whose name attribute's value matches that slot attribute's value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot
   */
  slot?: string;
  /**
   * An enumerated attribute defines whether the element may be checked for spelling errors.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/spellcheck
   */
  spellcheck?: Booleanable;
  /**
   * Contains CSS styling declarations to be applied to the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style
   */
  style?: string;
  /**
   * An integer attribute indicating if the element can take input focus (is focusable),
   * if it should participate to sequential keyboard navigation, and if so, at what position.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
   */
  tabindex?: number;
  /**
   * Contains a text representing advisory information related to the element it belongs to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title
   */
  title?: string;
  /**
   * An enumerated attribute that is used to specify whether an element's attribute values and the values of its
   * Text node children are to be translated when the page is localized, or whether to leave them unchanged.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/translate
   */
  translate?: 'yes' | 'no' | '';
}
interface BodyEvents {
  /**
   * Script to be run after the document is printed
   */
  onafterprint?: string;
  /**
   * Script to be run before the document is printed
   */
  onbeforeprint?: string;
  /**
   * Script to be run when the document is about to be unloaded
   */
  onbeforeunload?: string;
  /**
   * Script to be run when an error occurs
   */
  onerror?: string;
  /**
   * Script to be run when there has been changes to the anchor part of the a URL
   */
  onhashchange?: string;
  /**
   * Fires after the page is finished loading
   */
  onload?: string;
  /**
   * Script to be run when the message is triggered
   */
  onmessage?: string;
  /**
   * Script to be run when the browser starts to work offline
   */
  onoffline?: string;
  /**
   * Script to be run when the browser starts to work online
   */
  ononline?: string;
  /**
   * Script to be run when a user navigates away from a page
   */
  onpagehide?: string;
  /**
   * Script to be run when a user navigates to a page
   */
  onpageshow?: string;
  /**
   * Script to be run when the window's history changes
   */
  onpopstate?: string;
  /**
   * Fires when the browser window is resized
   */
  onresize?: string;
  /**
   * Script to be run when a Web Storage area is updated
   */
  onstorage?: string;
  /**
   * Fires once a page has unloaded (or the browser window has been closed)
   */
  onunload?: string;
}
interface BodyAttributesWithoutEvents extends Pick<GlobalAttributes, 'class' | 'style' | 'id'> {}
interface HtmlAttributes extends Pick<GlobalAttributes, 'lang' | 'dir' | 'translate' | 'class' | 'style' | 'id'> {
  /**
   * Open-graph protocol prefix.
   *
   * @see https://ogp.me/
   */
  prefix?: 'og: https://ogp.me/ns#' | (string & Record<never, never>);
  /**
   * XML namespace
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Namespaces_Crash_Course
   */
  xmlns?: string;
  /**
   * Custom XML namespace
   *
   * @See https://developer.mozilla.org/en-US/docs/Web/SVG/Namespaces_Crash_Course
   */
  [key: `xmlns:${'og' | string}`]: string;
}
type ReferrerPolicy = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
/**
 * Represents the possible blocking tokens for an element.
 */
type BlockingToken = 'render';
/**
 * Represents the blocking attribute for an element.
 * The blocking attribute must have a value that is an unordered set of unique space-separated tokens,
 * each of which are possible blocking tokens.
 */
interface Blocking {
  /**
   * The blocking attribute indicates that certain operations should be blocked on the fetching of an external resource.
   * The value is an unordered set of unique space-separated tokens, each of which are possible blocking tokens.
   *
   * @example
   * blocking: "render"
   */
  blocking?: BlockingToken | string;
}
type LinkRelTypes = 'alternate' | 'author' | 'shortcut icon' | 'bookmark' | 'canonical' | 'dns-prefetch' | 'external' | 'help' | 'icon' | 'license' | 'manifest' | 'me' | 'modulepreload' | 'next' | 'nofollow' | 'noopener' | 'noreferrer' | 'opener' | 'pingback' | 'preconnect' | 'prefetch' | 'preload' | 'prerender' | 'prev' | 'search' | 'shortlink' | 'stylesheet' | 'tag' | 'apple-touch-icon' | 'apple-touch-startup-image';
interface LinkWithoutEvents extends Pick<GlobalAttributes, 'nonce' | 'id'>, Blocking {
  /**
   * This attribute is only used when rel="preload" or rel="prefetch" has been set on the `<link>` element.
   * It specifies the type of content being loaded by the `<link>`, which is necessary for request matching,
   * application of correct content security policy, and setting of correct Accept request header.
   * Furthermore, rel="preload" uses this as a signal for request prioritization.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  as?: 'audio' | 'document' | 'embed' | 'fetch' | 'font' | 'image' | 'object' | 'script' | 'style' | 'track' | 'video' | 'worker';
  /**
   * The color attribute is used with the mask-icon link type.
   * The attribute must only be specified on link elements that have a rel attribute
   * that contains the mask-icon keyword.
   * The value must be a string that matches the CSS `<color>` production,
   * defining a suggested color that user agents can use to customize the display
   * of the icon that the user sees when they pin your site.
   *
   * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-link-color
   */
  color?: string;
  /**
   * This enumerated attribute indicates whether CORS must be used when fetching the resource.
   * CORS-enabled images can be reused in the `<canvas>` element without being tainted.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials';
  /**
   * Provides a hint of the relative priority to use when fetching a preloaded resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-fetchpriority
   */
  fetchpriority?: 'high' | 'low' | 'auto';
  /**
   * This attribute specifies the URL of the linked resource. A URL can be absolute or relative.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href?: string;
  /**
   * This attribute indicates the language of the linked resource. It is purely advisory.
   * Allowed values are specified by RFC 5646: Tags for Identifying Languages (also known as BCP 47).
   * Use this attribute only if the href attribute is present.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-hreflang
   */
  hreflang?: string;
  /**
   * For rel="preload" and as="image" only, the imagesizes attribute is a sizes attribute that indicates to preload
   * the appropriate resource used by an img element with corresponding values for its srcset and sizes attributes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-imagesizes
   */
  imagesizes?: string;
  /**
   * For rel="preload" and as="image" only, the imagesrcset attribute is a sourceset attribute that indicates
   * to preload the appropriate resource used by an img element with corresponding values for its srcset and
   * sizes attributes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-imagesrcset
   */
  imagesrcset?: string;
  /**
   * Contains inline metadata — a base64-encoded cryptographic hash of the resource (file)
   * you're telling the browser to fetch.
   * The browser can use this to verify that the fetched resource has been delivered free of unexpected manipulation.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-integrity
   */
  integrity?: string;
  /**
   * This attribute specifies the media that the linked resource applies to.
   * Its value must be a media type / media query.
   * This attribute is mainly useful when linking to external stylesheets —
   * it allows the user agent to pick the best adapted one for the device it runs on.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-integrity
   */
  media?: string;
  /**
   * Identifies a resource that might be required by the next navigation and that the user agent should retrieve it.
   * This allows the user agent to respond faster when the resource is requested in the future.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-prefetch
   */
  prefetch?: string;
  /**
   * A string indicating which referrer to use when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-referrerpolicy
   */
  referrerpolicy?: ReferrerPolicy;
  /**
   * This attribute names a relationship of the linked document to the current document.
   * The attribute must be a space-separated list of link type values.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-rel
   */
  rel?: LinkRelTypes | (string & Record<never, never>);
  /**
   * This attribute defines the sizes of the icons for visual media contained in the resource.
   * It must be present only if the rel contains a value of icon or a non-standard type
   * such as Apple's apple-touch-icon.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-sizes
   */
  sizes?: 'any' | '16x16' | '32x32' | '64x64' | '180x180' | (string & Record<never, never>);
  /**
   * The title attribute has special semantics on the `<link>` element.
   * When used on a `<link rel="stylesheet">` it defines a default or an alternate stylesheet.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-title
   */
  title?: string;
  /**
   * This attribute is used to define the type of the content linked to.
   * The value of the attribute should be a MIME type such as text/html, text/css, and so on.
   * The common use of this attribute is to define the type of stylesheet being referenced (such as text/css),
   * but given that CSS is the only stylesheet language used on the web,
   * not only is it possible to omit the type attribute, but is actually now recommended practice.
   * It is also used on rel="preload" link types, to make sure the browser only downloads file types that it supports.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
   */
  type?: 'audio/aac' | 'application/x-abiword' | 'application/x-freearc' | 'image/avif' | 'video/x-msvideo' | 'application/vnd.amazon.ebook' | 'application/octet-stream' | 'image/bmp' | 'application/x-bzip' | 'application/x-bzip2' | 'application/x-cdf' | 'application/x-csh' | 'text/css' | 'text/csv' | 'application/msword' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'application/vnd.ms-fontobject' | 'application/epub+zip' | 'application/gzip' | 'image/gif' | 'text/html' | 'image/vnd.microsoft.icon' | 'text/calendar' | 'application/java-archive' | 'image/jpeg' | 'text/javascript' | 'application/json' | 'application/ld+json' | 'audio/midi' | 'audio/x-midi' | 'audio/mpeg' | 'video/mp4' | 'video/mpeg' | 'application/vnd.apple.installer+xml' | 'application/vnd.oasis.opendocument.presentation' | 'application/vnd.oasis.opendocument.spreadsheet' | 'application/vnd.oasis.opendocument.text' | 'audio/ogg' | 'video/ogg' | 'application/ogg' | 'audio/opus' | 'font/otf' | 'image/png' | 'application/pdf' | 'application/x-httpd-php' | 'application/vnd.ms-powerpoint' | 'application/vnd.openxmlformats-officedocument.presentationml.presentation' | 'application/vnd.rar' | 'application/rtf' | 'application/x-sh' | 'image/svg+xml' | 'application/x-tar' | 'image/tiff' | 'video/mp2t' | 'font/ttf' | 'text/plain' | 'application/vnd.visio' | 'audio/wav' | 'audio/webm' | 'video/webm' | 'image/webp' | 'font/woff' | 'font/woff2' | 'application/xhtml+xml' | 'application/vnd.ms-excel' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' | 'text/xml' | 'application/atom+xml' | 'application/xml' | 'application/vnd.mozilla.xul+xml' | 'application/zip' | 'video/3gpp' | 'audio/3gpp' | 'video/3gpp2' | 'audio/3gpp2' | (string & Record<never, never>);
}
type MetaNames = 'apple-itunes-app' | 'apple-mobile-web-app-capable' | 'apple-mobile-web-app-status-bar-style' | 'apple-mobile-web-app-title' | 'application-name' | 'author' | 'charset' | 'color-scheme' | 'content-security-policy' | 'content-type' | 'creator' | 'default-style' | 'description' | 'fb:app_id' | 'format-detection' | 'generator' | 'google-site-verification' | 'google' | 'googlebot' | 'keywords' | 'mobile-web-app-capable' | 'msapplication-Config' | 'msapplication-TileColor' | 'msapplication-TileImage' | 'publisher' | 'rating' | 'referrer' | 'refresh' | 'robots' | 'theme-color' | 'twitter:app:id:googleplay' | 'twitter:app:id:ipad' | 'twitter:app:id:iphone' | 'twitter:app:name:googleplay' | 'twitter:app:name:ipad' | 'twitter:app:name:iphone' | 'twitter:app:url:googleplay' | 'twitter:app:url:ipad' | 'twitter:app:url:iphone' | 'twitter:card' | 'twitter:creator:id' | 'twitter:creator' | 'twitter:data:1' | 'twitter:data:2' | 'twitter:description' | 'twitter:image:alt' | 'twitter:image' | 'twitter:label:1' | 'twitter:label:2' | 'twitter:player:height' | 'twitter:player:stream' | 'twitter:player:width' | 'twitter:player' | 'twitter:site:id' | 'twitter:site' | 'twitter:title' | 'viewport' | 'x-ua-compatible';
type MetaProperties = 'article:author' | 'article:expiration_time' | 'article:modified_time' | 'article:published_time' | 'article:section' | 'article:tag' | 'book:author' | 'book:isbn' | 'book:release_data' | 'book:tag' | 'fb:app:id' | 'og:audio:secure_url' | 'og:audio:type' | 'og:audio:url' | 'og:description' | 'og:determiner' | 'og:image:height' | 'og:image:secure_url' | 'og:image:type' | 'og:image:url' | 'og:image:width' | 'og:image' | 'og:locale:alternate' | 'og:locale' | 'og:site:name' | 'og:title' | 'og:type' | 'og:url' | 'og:video:height' | 'og:video:secure_url' | 'og:video:type' | 'og:video:url' | 'og:video:width' | 'og:video' | 'profile:first_name' | 'profile:gender' | 'profile:last_name' | 'profile:username';
interface Meta extends Pick<GlobalAttributes, 'id'> {
  /**
   * This attribute declares the document's character encoding.
   * If the attribute is present, its value must be an ASCII case-insensitive match for the string "utf-8",
   * because UTF-8 is the only valid encoding for HTML5 documents.
   * `<meta>` elements which declare a character encoding must be located entirely within the first 1024 bytes
   * of the document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-charset
   */
  charset?: 'utf-8' | (string & Record<never, never>);
  /**
   * This attribute contains the value for the http-equiv or name attribute, depending on which is used.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content
   */
  content?: Stringable;
  /**
   * Defines a pragma directive. The attribute is named http-equiv(alent) because all the allowed values are names of
   * particular HTTP headers.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-http-equiv
   */
  ['http-equiv']?: 'content-security-policy' | 'content-type' | 'default-style' | 'x-ua-compatible' | 'refresh' | 'accept-ch' | (string & Record<never, never>);
  /**
   * The name and content attributes can be used together to provide document metadata in terms of name-value pairs,
   * with the name attribute giving the metadata name, and the content attribute giving the value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-name
   */
  name?: MetaNames | (string & Record<never, never>);
  /**
   * The property attribute is used to define a property associated with the content attribute.
   *
   * Mainly used for og and twitter meta tags.
   */
  property?: MetaProperties | (string & Record<never, never>);
  /**
   * A valid media query list that can be included to set the media the `theme-color` metadata applies to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color
   */
  media?: '(prefers-color-scheme: light)' | '(prefers-color-scheme: dark)' | (string & Record<never, never>);
}
interface Noscript {
  /**
   * This attribute defines the unique ID.
   */
  id?: string;
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: string;
  /**
   * The style global attribute contains CSS styling declarations to be applied to the element.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style
   */
  style?: string;
}
interface ScriptWithoutEvents extends Pick<GlobalAttributes, 'nonce' | 'id'>, Blocking {
  /**
   * For classic scripts, if the async attribute is present,
   * then the classic script will be fetched in parallel to parsing and evaluated as soon as it is available.
   *
   * For module scripts,
   * if the async attribute is present then the scripts and all their dependencies will be executed in the defer queue,
   * therefore they will get fetched in parallel to parsing and evaluated as soon as they are available.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async
   */
  async?: Booleanable;
  /**
   * Normal script elements pass minimal information to the window.onerror
   * for scripts which do not pass the standard CORS checks.
   * To allow error logging for sites which use a separate domain for static media, use this attribute.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials';
  /**
   * This Boolean attribute is set to indicate to a browser that the script is meant to be executed after the document
   * has been parsed, but before firing DOMContentLoaded.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer
   */
  defer?: Booleanable;
  /**
   * Provides a hint of the relative priority to use when fetching an external script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-fetchpriority
   */
  fetchpriority?: 'high' | 'low' | 'auto';
  /**
   * This attribute contains inline metadata that a user agent can use to verify
   * that a fetched resource has been delivered free of unexpected manipulation.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-integrity
   */
  integrity?: string;
  /**
   * This Boolean attribute is set to indicate that the script should not be executed in browsers
   * that support ES modules — in effect,
   * this can be used to serve fallback scripts to older browsers that do not support modular JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-nomodule
   */
  nomodule?: Booleanable;
  /**
   * Indicates which referrer to send when fetching the script, or resources fetched by the script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-referrerpolicy
   */
  referrerpolicy?: ReferrerPolicy;
  /**
   * This attribute specifies the URI of an external script;
   * this can be used as an alternative to embedding a script directly within a document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-src
   */
  src?: string;
  /**
   * This attribute indicates the type of script represented.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type?: '' | 'text/javascript' | 'module' | 'application/json' | 'application/ld+json' | 'speculationrules' | (string & Record<never, never>);
  /**
   * A custom element name
   *
   * Used by the AMP specification.
   *
   * @see https://amp.dev/documentation/guides-and-tutorials/learn/spec/amphtml/#custom-elements
   */
  ['custom-element']?: 'amp-story' | 'amp-carousel' | 'amp-ad' | (string & Record<never, never>);
}
interface Style extends Pick<GlobalAttributes, 'nonce' | 'id'>, Blocking {
  /**
   * This attribute defines which media the style should be applied to.
   * Its value is a media query, which defaults to all if the attribute is missing.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style#attr-media
   */
  media?: string;
  /**
   * A cryptographic nonce (number used once) used to allow inline styles in a style-src Content-Security-Policy.
   * The server must generate a unique nonce value each time it transmits a policy.
   * It is critical to provide a nonce that cannot be guessed as bypassing a resource's policy is otherwise trivial.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style#attr-nonce
   */
  nonce?: string;
  /**
   * This attribute specifies alternative style sheet sets.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style#attr-title
   */
  title?: string;
}
interface DeprecatedResolvesDuplicates {
  /**
   * @deprecated You should avoid using keys to dedupe meta as they are automatically deduped.
   * If you need to change the meta tag rendered use tagPriority.
   */
  key?: string;
  /**
   * @deprecated Remove
   */
  tagDuplicateStrategy?: 'replace' | 'merge';
}
interface SchemaAugmentations {
  title: TagPriority;
  titleTemplate: TagPriority;
  base: ResolvesDuplicates & TagPriority;
  htmlAttrs: ResolvesDuplicates & TagPriority;
  bodyAttrs: ResolvesDuplicates & TagPriority;
  link: TagPriority & TagPosition & ResolvesDuplicates & ProcessesTemplateParams;
  meta: TagPriority & DeprecatedResolvesDuplicates & ProcessesTemplateParams;
  style: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams;
  script: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams;
  noscript: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams;
}
type MaybeArray<T> = T | T[];
interface UnheadBodyAttributesWithoutEvents extends Omit<BodyAttributesWithoutEvents, 'class' | 'style'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<boolean>>;
  /**
   * The style attribute contains CSS styling declarations to be applied to the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style
   */
  style?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<Stringable>>;
}
interface UnheadHtmlAttributes extends Omit<HtmlAttributes, 'class' | 'style'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<boolean>>;
  /**
   * The style attribute contains CSS styling declarations to be applied to the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style
   */
  style?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<Stringable>>;
}
interface UnheadMeta extends Omit<Meta, 'content'> {
  /**
   * This attribute contains the value for the http-equiv, name or property attribute, depending on which is used.
   *
   * You can provide an array of values to create multiple tags sharing the same name, property or http-equiv.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content
   */
  content?: MaybeArray<Stringable> | null;
}
type MaybeEventFnHandlers<T> = { [key in keyof T]?: T[key] | ((e: Event) => void) };
type ResolvableTitle = ResolvableValue<Stringable> | ResolvableProperties<({
  textContent: string;
} & SchemaAugmentations['title'])>;
type ResolvableTitleTemplate = string | ((title?: string) => string | null) | null | ({
  textContent: string | ((title?: string) => string | null);
} & SchemaAugmentations['titleTemplate']);
type ResolvableBase = ResolvableProperties<Base & SchemaAugmentations['base']>;
type ResolvableLink = ResolvableProperties<LinkWithoutEvents & DataKeys & SchemaAugmentations['link']> & MaybeEventFnHandlers<HttpEventAttributes>;
type ResolvableMeta = ResolvableProperties<UnheadMeta & DataKeys & SchemaAugmentations['meta']>;
type ResolvableStyle = ResolvableProperties<Style & DataKeys & SchemaAugmentations['style']> | string;
type ResolvableScript = ResolvableProperties<ScriptWithoutEvents & DataKeys & SchemaAugmentations['script']> & MaybeEventFnHandlers<HttpEventAttributes> | string;
type ResolvableNoscript = ResolvableProperties<Noscript & DataKeys & SchemaAugmentations['noscript']> | string;
type ResolvableHtmlAttributes = ResolvableProperties<UnheadHtmlAttributes & DataKeys & SchemaAugmentations['htmlAttrs']>;
type ResolvableBodyAttributes = ResolvableProperties<UnheadBodyAttributesWithoutEvents & DataKeys & SchemaAugmentations['bodyAttrs']> & MaybeEventFnHandlers<BodyEvents>;
type ResolvableTemplateParams = {
  separator?: '|' | '-' | '·' | string;
} & Record<string, null | string | Record<string, string>>;
interface ResolvableHead {
  /**
   * The `<title>` HTML element defines the document's title that is shown in a browser's title bar or a page's tab.
   * It only contains text; tags within the element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title?: ResolvableTitle;
  /**
   * The `<base>` HTML element specifies the base URL to use for all relative URLs in a document.
   * There can be only one <base> element in a document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
   */
  base?: ResolvableValue<ResolvableBase>;
  /**
   * The `<link>` HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: ResolvableValue<ResolvableValue<ResolvableLink>[]>;
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: ResolvableValue<ResolvableValue<ResolvableMeta>[]>;
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: ResolvableValue<ResolvableValue<(ResolvableStyle)>[]>;
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: ResolvableValue<ResolvableValue<(ResolvableScript)>[]>;
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: ResolvableValue<ResolvableValue<(ResolvableNoscript)>[]>;
  /**
   * Attributes for the `<html>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: ResolvableValue<ResolvableHtmlAttributes>;
  /**
   * Attributes for the `<body>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: ResolvableValue<ResolvableBodyAttributes>;
  /**
   * Generate the title from a template.
   *
   * Should include a `%s` placeholder for the title, for example `%s - My Site`.
   */
  titleTemplate?: ResolvableTitleTemplate;
  /**
   * Variables used to substitute in the title and meta content.
   */
  templateParams?: ResolvableTemplateParams;
}
interface SerializableHead {
  title?: string;
  titleTemplate?: string;
  base?: Base & DataKeys & SchemaAugmentations['base'];
  templateParams?: Record<string, any>;
  link?: (LinkWithoutEvents & DataKeys & HttpEventAttributes & SchemaAugmentations['link'])[];
  meta?: (Meta & DataKeys & SchemaAugmentations['meta'])[];
  style?: (Style & DataKeys & SchemaAugmentations['style'])[];
  script?: (ScriptWithoutEvents & DataKeys & HttpEventAttributes & SchemaAugmentations['script'])[];
  noscript?: (Noscript & DataKeys & SchemaAugmentations['noscript'])[];
  htmlAttrs?: HtmlAttributes & DataKeys & SchemaAugmentations['htmlAttrs'];
  bodyAttrs?: BodyAttributesWithoutEvents & DataKeys & BodyEvents & SchemaAugmentations['bodyAttrs'];
}
interface ResolvesDuplicates {
  /**
   * By default, tags which share the same unique key `name`, `property` are de-duped. To allow duplicates
   * to be made you can provide a unique key for each entry.
   */
  key?: string;
  /**
   * The strategy to use when a duplicate tag is encountered.
   *
   * - `replace` - Replace the existing tag with the new tag
   * - `merge` - Merge the existing tag with the new tag
   *
   * @default 'replace' (some tags will default to 'merge', such as htmlAttr)
   */
  tagDuplicateStrategy?: 'replace' | 'merge';
}
type ValidTagPositions = 'head' | 'bodyClose' | 'bodyOpen';
interface TagPosition {
  /**
   * Specify where to render the tag.
   *
   * @default 'head'
   */
  tagPosition?: ValidTagPositions;
}
type InnerContentVal = string | Record<string, any>;
interface InnerContent {
  /**
   * Text content of the tag.
   *
   * Warning: This is not safe for XSS. Do not use this with user input, use `textContent` instead.
   */
  innerHTML?: InnerContentVal;
  /**
   * Sets the textContent of an element. Safer for XSS.
   */
  textContent?: InnerContentVal;
}
interface TagPriority {
  /**
   * The priority for rendering the tag, without this all tags are rendered as they are registered
   * (besides some special tags).
   *
   * The following special tags have default priorities:
   * -2 `<meta charset ...>`
   * -1 `<base>`
   * 0 `<meta http-equiv="content-security-policy" ...>`
   *
   * All other tags have a default priority of 10: `<meta>`, `<script>`, `<link>`, `<style>`, etc
   */
  tagPriority?: number | 'critical' | 'high' | 'low' | `before:${string}` | `after:${string}`;
}
type TagKey = keyof ResolvableHead;
type TemplateParams = {
  separator?: '|' | '-' | '·' | string;
} & Record<string, null | string | Record<string, string>>;
interface ProcessesTemplateParams {
  processTemplateParams?: boolean;
}
interface HasTemplateParams {
  templateParams?: TemplateParams;
}
interface HeadTag extends TagPriority, TagPosition, ResolvesDuplicates, HasTemplateParams {
  tag: TagKey;
  props: Record<string, string>;
  processTemplateParams?: boolean;
  innerHTML?: string;
  textContent?: string;
  /**
   * @internal
   */
  _w?: number;
  /**
   * @internal
   */
  _p?: number;
  /**
   * @internal
   */
  _d?: string;
  /**
   * @internal
   */
  _h?: string;
  /**
   * @internal
   */
  mode?: RuntimeMode;
}
interface RenderSSRHeadOptions {
  omitLineBreaks?: boolean;
  resolvedTags?: HeadTag[];
}
type RuntimeMode = 'server' | 'client';
//#endregion
//#region ../../node_modules/.pnpm/unhead@2.1.3/node_modules/unhead/dist/types.d.ts
interface AriaAttributes {
  /**
   * Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change
   * notifications defined by the aria-relevant attribute.
   */
  'role'?: 'alert' | 'alertdialog' | 'application' | 'article' | 'banner' | 'button' | 'checkbox' | 'columnheader' | 'combobox' | 'complementary' | 'contentinfo' | 'definition' | 'dialog' | 'directory' | 'document' | 'feed' | 'figure' | 'form' | 'grid' | 'gridcell' | 'group' | 'heading' | 'img' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main' | 'marquee' | 'math' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'navigation' | 'note' | 'option' | 'presentation' | 'progressbar' | 'radio' | 'radiogroup' | 'region' | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider' | 'spinbutton' | 'status' | 'switch' | 'tab' | 'table' | 'tablist' | 'tabpanel' | 'textbox' | 'timer' | 'toolbar' | 'tooltip' | 'tree' | 'treegrid' | 'treeitem';
  /**
   * Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application.
   */
  'aria-activedescendant'?: string;
  /**
   * Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change
   * notifications defined by the aria-relevant attribute.
   */
  'aria-atomic'?: Booleanable;
  /**
   * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for
   * an input and specifies how predictions would be presented if they are made.
   */
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  /**
   * Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are
   * complete before exposing them to the user.
   */
  'aria-busy'?: Booleanable;
  /**
   * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
   */
  'aria-checked'?: Booleanable | 'mixed';
  /**
   * Defines the total number of columns in a table, grid, or treegrid.
   */
  'aria-colcount'?: number;
  /**
   * Defines an element's column index or position with respect to the total number of columns within a table, grid, or
   * treegrid.
   */
  'aria-colindex'?: number;
  /**
   * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
   */
  'aria-colspan'?: number;
  /**
   * Identifies the element (or elements) whose contents or presence are controlled by the current element.
   */
  'aria-controls'?: string;
  /**
   * Indicates the element that represents the current item within a container or set of related elements.
   */
  'aria-current'?: Booleanable | 'page' | 'step' | 'location' | 'date' | 'time';
  /**
   * Identifies the element (or elements) that describes the object.
   */
  'aria-describedby'?: string;
  /**
   * Identifies the element that provides a detailed, extended description for the object.
   */
  'aria-details'?: string;
  /**
   * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
   */
  'aria-disabled'?: Booleanable;
  /**
   * Indicates what functions can be performed when a dragged object is released on the drop target.
   */
  'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup';
  /**
   * Identifies the element that provides an error message for the object.
   */
  'aria-errormessage'?: string;
  /**
   * Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed.
   */
  'aria-expanded'?: Booleanable;
  /**
   * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
   * allows assistive technology to override the general default of reading in document source order.
   */
  'aria-flowto'?: string;
  /**
   * Indicates an element's "grabbed" state in a drag-and-drop operation.
   */
  'aria-grabbed'?: Booleanable;
  /**
   * Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by
   * an element.
   */
  'aria-haspopup'?: Booleanable | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  /**
   * Indicates whether the element is exposed to an accessibility API.
   */
  'aria-hidden'?: Booleanable;
  /**
   * Indicates the entered value does not conform to the format expected by the application.
   */
  'aria-invalid'?: Booleanable | 'grammar' | 'spelling';
  /**
   * Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element.
   */
  'aria-keyshortcuts'?: string;
  /**
   * Defines a string value that labels the current element.
   */
  'aria-label'?: string;
  /**
   * Identifies the element (or elements) that labels the current element.
   */
  'aria-labelledby'?: string;
  /**
   * Defines the hierarchical level of an element within a structure.
   */
  'aria-level'?: number;
  /**
   * Indicates that an element will be updated, and describes the types of updates the user agents, assistive
   * technologies, and user can expect from the live region.
   */
  'aria-live'?: 'off' | 'assertive' | 'polite';
  /**
   * Indicates whether an element is modal when displayed.
   */
  'aria-modal'?: Booleanable;
  /**
   * Indicates whether a text box accepts multiple lines of input or only a single line.
   */
  'aria-multiline'?: Booleanable;
  /**
   * Indicates that the user may select more than one item from the current selectable descendants.
   */
  'aria-multiselectable'?: Booleanable;
  /**
   * Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous.
   */
  'aria-orientation'?: 'horizontal' | 'vertical';
  /**
   * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
   * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
   */
  'aria-owns'?: string;
  /**
   * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no
   * value. A hint could be a sample value or a brief description of the expected format.
   */
  'aria-placeholder'?: string;
  /**
   * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements
   * in the set are present in the DOM.
   */
  'aria-posinset'?: number;
  /**
   * Indicates the current "pressed" state of toggle buttons.
   */
  'aria-pressed'?: Booleanable | 'mixed';
  /**
   * Indicates that the element is not editable, but is otherwise operable.
   */
  'aria-readonly'?: Booleanable;
  /**
   * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
   */
  'aria-relevant'?: 'additions' | 'additions text' | 'all' | 'removals' | 'text';
  /**
   * Indicates that user input is required on the element before a form may be submitted.
   */
  'aria-required'?: Booleanable;
  /**
   * Defines a human-readable, author-localized description for the role of an element.
   */
  'aria-roledescription'?: string;
  /**
   * Defines the total number of rows in a table, grid, or treegrid.
   */
  'aria-rowcount'?: number;
  /**
   * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
   */
  'aria-rowindex'?: number;
  /**
   * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
   */
  'aria-rowspan'?: number;
  /**
   * Indicates the current "selected" state of various widgets.
   */
  'aria-selected'?: Booleanable;
  /**
   * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
   */
  'aria-setsize'?: number;
  /**
   * Indicates if items in a table or grid are sorted in ascending or descending order.
   */
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  /**
   * Defines the maximum allowed value for a range widget.
   */
  'aria-valuemax'?: number;
  /**
   * Defines the minimum allowed value for a range widget.
   */
  'aria-valuemin'?: number;
  /**
   * Defines the current value for a range widget.
   */
  'aria-valuenow'?: number;
  /**
   * Defines the human readable text alternative of aria-valuenow for a range widget.
   */
  'aria-valuetext'?: string;
}
//#endregion
export { type SerializableHead as a, type RenderSSRHeadOptions as i, type DataKeys as n, type GlobalAttributes as r, type AriaAttributes as t };