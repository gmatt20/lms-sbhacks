interface ButtonLinkProps {
  url: string;
  size?: "small" | "large";
  children: React.ReactNode;
}

export const ButtonLink = ({ url, size, children }: ButtonLinkProps) => {
  return <a href={url}>{children}</a>;
};
