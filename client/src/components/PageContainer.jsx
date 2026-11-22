// Single source of truth for horizontal page width. The navbar uses the same
// classes so logo, links and profile line up with page content edges.
export const CONTAINER_CLASS = 'w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14'

export default function PageContainer({ children, className = '', as: Tag = 'div' }) {
  return <Tag className={`${CONTAINER_CLASS} ${className}`}>{children}</Tag>
}
