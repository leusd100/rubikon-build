/** Use gtag's Arguments protocol: ordinary arrays can silently lose event commands. */
export function queueGoogleCommand(...args: unknown[]): void {
  void args;
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params -- gtag requires an Arguments command.
  window.dataLayer.push(arguments);
}
