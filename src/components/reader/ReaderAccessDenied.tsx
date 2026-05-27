type Props = {
  message: string;
};

export function ReaderAccessDenied({ message }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-stone-100 px-4 text-center">
      <p className="text-lg font-medium text-stone-900">접근할 수 없습니다</p>
      <p className="mt-2 max-w-sm text-sm text-stone-500">{message}</p>
    </div>
  );
}
