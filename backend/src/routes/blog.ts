import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { createBlogInput, updateBlogInput } from "@sanyogsr/common";
import { Hono } from "hono";
import { verify } from "hono/jwt";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();
//blog route middleware

blogRouter.use("/*", async (c, next) => {
  const jwt = c.req.header("authorization") || "";

  if (!jwt) {
    c.status(401);
    return c.json({ error: "not found token" });
  }
  try {
    const user = await verify(jwt, c.env.JWT_SECRET);
    if (!user) {
      c.status(403);
      return c.json({
        error: "You are not logged in",
      });
    }

    c.set("userId", user.id as string);
    console.log(user.id);
    await next();
  } catch (err) {
    c.status(411);
    return c.json({
      msg: "You are not logged in",
    });
  }
});

//   blog routes
blogRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { success } = createBlogInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Inputs not correct",
    });
  }
  const authorId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.blog.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: Number(authorId),
      },
    });

    return c.json({
      blogId: blog.id,
    });
  } catch (err) {
    c.status(411);
    c.json("internal error");
  }
});

blogRouter.put("/", async (c) => {
  try {
    const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);
    if (!success) {
      c.status(411);
      return c.json({
        message: "Inputs not correct",
      });
    }
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const blog = await prisma.blog.update({
      where: {
        id: body.id,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });

    return c.json({
      blogId: blog.id,
    });
  } catch (err) {
    c.status(411);
    return c.json("internal error");
  }
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blogs = await prisma.blog.findMany();

    return c.json({
      blogs,
    });
  } catch (err) {
    c.status(411);
    c.json("internal error");
  }
});
blogRouter.get("/:id", async (c) => {
  try {
    const id = await c.req.param("id");
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const blog = await prisma.blog.findFirst({
      where: {
        id: Number(id),
      },
    });

    return c.json({
      blog,
    });
  } catch (err) {
    c.status(411);
    c.json("internal error");
  }
});
