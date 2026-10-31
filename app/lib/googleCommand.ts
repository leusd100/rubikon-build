/** Use gtag's Arguments protocol: ordinary arrays can silently lose event commands. */
export const queueGoogleCommand: (...command: unknown[]) => void = function () {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params -- gtag requires an Arguments command.
  window.dataLayer.push(arguments);
};
