import { FormControl } from '@angular/forms';

import { integer, maxDecimals } from './validators';

describe('validators', () => {
  it('maxDecimals accepts up to the given number of decimals', () => {
    const validator = maxDecimals(3);

    expect(validator(new FormControl(12.5))).toBeNull();
    expect(validator(new FormControl(12.125))).toBeNull();
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl(12.1255))).toEqual({ maxDecimals: { max: 3 } });
  });

  it('integer refuses a decimal value', () => {
    expect(integer(new FormControl(4))).toBeNull();
    expect(integer(new FormControl(null))).toBeNull();
    expect(integer(new FormControl(4.5))).toEqual({ integer: true });
  });
});
