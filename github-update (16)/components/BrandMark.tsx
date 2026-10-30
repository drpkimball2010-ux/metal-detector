import Image from "next/image";
import mark from "./logo-mark.png";

// The logo's icon (bars, coins and arrow), shown next to the site name
export default function BrandMark() {
  return <Image className="brand-mark" src={mark} alt="" width={34} height={34} priority />;
}
