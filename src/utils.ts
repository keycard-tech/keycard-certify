export namespace Utils {
  const numStrLength = 6;
  const RFC4648 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

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



  export function uint20ToBase32(num: number): string {
    return RFC4648.charAt((num >> 15) & 0x1F) + RFC4648.charAt((num >> 10) & 0x1F) + RFC4648.charAt((num >> 5) & 0x1F) + RFC4648.charAt(num & 0x1F)
  }
}