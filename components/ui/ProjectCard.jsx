"use client";

import Image from "next/image";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProjectCard({
  id,
  title,
  thumbnail,
  lastEditedText,
  participants = [],
})
{
  const router = useRouter();
  return (
    <div
      className="group relative flex flex-col rounded-xl border bg-[#202026] 
  border-t-[#36363E] border-b-[#121212] border-r-[#121212] border-l-[#36363E] 
  hover:border-b-[#36363E] hover:border-r-[#36363E] hover:border-t-[#36363E] hover:border-l-[#36363E] 
  transition-colors shadow-md shadow-[rgba(2,2,9,0.25)] 
  px-4 py-4 max-w-[300px] min-w-[250px] w-full cursor-pointer"
      onClick={() => {
        router.push(`/project/${id}`);
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt="Project thumbnail"
            className="h-full w-full object-cover"
            width={600}
            height={400}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#101426] text-gray-400">
            <Image
              src="/thumbnail.svg"
              alt="No thumbnail"
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Action button */}
        <button className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-80 hover:bg-black/80 hover:opacity-100">
          <MoreVertical className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex justify-between pt-4 pb-2">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
          {lastEditedText && (
            <p className="mt-1 text-sm text-gray-400">{lastEditedText}</p>
          )}
        </div>

        {/* Participants */}
        <div className="flex items-center justify-end">
          <div className="flex -space-x-4">
            {participants?.slice(0, 2).map((p) => (
              <div
                key={p.id}
                className="flex size-9 items-center justify-center rounded-full border border-[#3A3A3F] bg-[#121217] text-sm font-semibold text-white"
              >
                {p.initials}
              </div>
            ))}
            {participants?.length > 2 && (
              <div className="flex size-9 items-center justify-center rounded-full border border-[#3A3A3F] bg-[#121217] text-sm text-gray-300">
                +{participants.length - 2}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
