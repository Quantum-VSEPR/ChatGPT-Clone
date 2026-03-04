declare module "lucide-react/dist/esm/icons/*" {
  import { ForwardRefExoticComponent, RefAttributes } from "react";
  import { LucideProps } from "lucide-react";

  const Icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  export default Icon;
}
