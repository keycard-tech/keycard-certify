export namespace Utils {
  const numStrLength = 6;

  export function hx(arr: Uint8Array): string {
    return Buffer.from(arr).toString('hex');
  }

  export function checkInputNumericValue(value: string, len: number) : boolean {
    if(value.length == len) {
      return value.split("").every((c) => '0123456789'.includes(c));
    }

    return false;
  }

  export function formatNumtoString(num: number) : string {
    let res = num.toString();

    for(let i = res.length; res.length < numStrLength; i++) {
      let zero = "0";
      res = zero + res;
    }

    return res;
  }
}